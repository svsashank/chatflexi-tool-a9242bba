
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
    
    // Debug logging for URL content - reduce verbosity
    if (files.length > 0) {
      console.log(`Message includes ${files.filter(file => file.startsWith('URL:')).length} URL content files`);
    }
    
    console.log('Sending message to LLM:', { 
      model: model.name, 
      modelId: model.id, 
      provider: model.provider
    });
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout - increasing from 30 to 60 seconds
    
    try {
      // Create a promise that will reject when the controller aborts
      const timeoutPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timed out after 60 seconds'));
        });
      });
      
      // Better error message for timeout
      const showTimeoutMessage = setTimeout(() => {
        toast({
          title: "Response taking longer than usual",
          description: "The AI model is processing your request. This may take a moment...",
          variant: "default",
        });
      }, 15000); // Show a message after 15 seconds
      
      // Race between the actual API call and the timeout
      const result = await Promise.race([
        supabase.functions.invoke('chat', {
          body: { 
            model,
            content,
            messages: messageHistory,
            images,
            files
          }
        }),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId);
      clearTimeout(showTimeoutMessage);
      
      // Type assertion since we know this is from the supabase call if we get here
      const { data, error } = result as { data: any, error: any };
      
      if (error) {
        console.error(`Error with ${model.provider} API:`, error);
        throw error;
      }
      
      if (!data || (!data.content && !data.error)) {
        throw new Error("Empty response received from API");
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
        throw new Error('Response is taking longer than expected. You may need to try again.');
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    toast({
      title: "Response Failed",
      description: `${error.message || 'An unexpected error occurred'}. Please try again.`,
      variant: "destructive",
    });
    
    return {
      content: `Error: ${error.message || 'Failed to get response from model'}. Please try again.`,
      tokens: { input: 0, output: 0 }
    };
  }
};
