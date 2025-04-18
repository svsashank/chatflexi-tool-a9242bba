
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";
import { toast } from "@/components/ui/use-toast";

// Cache for recent responses to prevent redundant calls
const responseCache = new Map<string, {
  timestamp: number;
  response: any;
}>();

// Cache TTL in milliseconds (2 minutes)
const CACHE_TTL = 2 * 60 * 1000;

// Formats the chat history for better context preservation
const formatMessageHistory = (messages: Message[]) => {
  // Only include the last 10 messages to avoid token limits and improve performance
  const recentMessages = messages.slice(-10);
  
  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
    // Include model info for better context
    model: msg.model.name,
    // Include images if they exist
    images: msg.images || [],
    // Include files if they exist
    files: msg.files || []
  }));
};

// Generate a cache key based on content, model and context
const generateCacheKey = (content: string, modelId: string, conversationHistory: Message[]): string => {
  // Use only the last message from history for the cache key to balance cache hits vs. context sensitivity
  const lastContextMessage = conversationHistory.length > 0 ? 
    `${conversationHistory[conversationHistory.length - 1].role}:${conversationHistory[conversationHistory.length - 1].content.substring(0, 100)}` : '';
  
  return `${modelId}:${content}:${lastContextMessage}`;
};

// Sends a message to the specified model via Supabase Edge Function
export const sendMessageToLLM = async (
  content: string,
  model: AIModel,
  conversationHistory: Message[]
): Promise<{
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
  webSearchResults?: any[];
  fileSearchResults?: any[];
}> => {
  try {
    // Check cache first
    const cacheKey = generateCacheKey(content, model.id, conversationHistory);
    const cachedResponse = responseCache.get(cacheKey);
    
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      console.log('Using cached LLM response');
      return cachedResponse.response;
    }

    // Format conversation history with better context preservation
    const messageHistory = formatMessageHistory(conversationHistory);
    
    // Get the last message which might contain images or files
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const images = lastMessage?.images || [];
    const files = lastMessage?.files || [];
    
    // Debug logging for URL content
    if (files.length > 0) {
      const urlFiles = files.filter(file => file.startsWith('URL:'));
      if (urlFiles.length > 0) {
        console.log(`Message includes ${urlFiles.length} URL content files`);
      }
    }
    
    console.log('Sending message to LLM:', { 
      model: model.name, 
      modelId: model.id, 
      provider: model.provider
    });
    
    if (files.length > 0) {
      console.log(`Sending ${files.length} files to LLM`);
    }
    
    // Call the Supabase Edge Function with retries for better reliability
    let attempts = 0;
    const maxAttempts = 3; // Increase the number of retry attempts
    let lastError;
    
    // Use AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            model,
            content,
            messages: messageHistory,
            images,  // Pass images for API compatibility
            files    // Pass files for file processing
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error(`Attempt ${attempts + 1}: Error with ${model.provider} API:`, error);
          lastError = error;
          attempts++;
          // Wait before retry, with increasing delay
          if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
        
        if (!data || (!data.content && !data.error)) {
          console.error(`Attempt ${attempts + 1}: Empty response from ${model.provider} API`);
          lastError = new Error("Empty response received from API");
          attempts++;
          // Wait before retry, with increasing delay
          if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
        
        console.log('Received response from LLM');
        
        // If content is empty but we have search results, create a placeholder message
        if (!data.content && (data.webSearchResults?.length > 0 || data.fileSearchResults?.length > 0)) {
          data.content = "I'm currently searching for information related to your request. The results will be processed shortly.";
        }
        
        // Ensure we always have some content
        if (!data.content) {
          data.content = "I'm processing your request. Please wait a moment for the full response.";
        }
        
        const response = {
          content: data.content,
          tokens: data.tokens || { input: 0, output: 0 },
          webSearchResults: data.webSearchResults || [],
          fileSearchResults: data.fileSearchResults || []
        };
        
        // Cache the successful response
        responseCache.set(cacheKey, {
          timestamp: Date.now(),
          response
        });
        
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Handle AbortController timeout
        if (error.name === 'AbortError') {
          console.error('Request timed out');
          throw new Error('Request timed out after 30 seconds');
        }
        
        console.error(`Attempt ${attempts + 1}: Error with ${model.provider} API:`, error);
        lastError = error;
        attempts++;
        // Wait before retry, with increasing delay
        if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    // If we get here, all attempts failed
    toast({
      title: "Connection Error",
      description: "Failed to get a response from the AI. Please try again.",
      variant: "destructive",
    });
    
    return {
      content: `Error: ${lastError?.message || 'Failed to get response after multiple attempts'}. Please try again.`,
      tokens: { input: 0, output: 0 }
    };
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    toast({
      title: "Error",
      description: `Error: ${error.message || 'An unexpected error occurred'}`,
      variant: "destructive",
    });
    
    return {
      content: `Error: ${error.message || 'Failed to get response from model'}. Please try again.`,
      tokens: { input: 0, output: 0 }
    };
  }
};
