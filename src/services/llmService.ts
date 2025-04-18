
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";
import { toast } from "@/components/ui/use-toast";

// Enhanced cache for recent responses to prevent redundant calls
// Using a more sophisticated caching mechanism with TTL
const responseCache = new Map<string, {
  timestamp: number;
  response: any;
  ttl: number; // Individual TTL for different models
}>();

// Cache TTLs in milliseconds (different for different models)
const DEFAULT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes default
const MODEL_SPECIFIC_TTLS = {
  'gpt-4o': 5 * 60 * 1000, // 5 minutes for GPT-4o
  'deepseek-r1': 10 * 60 * 1000, // 10 minutes for DeepSeek
};

// Performance metric tracking
const perfMetrics = {
  totalCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  responseTimeTotal: 0
};

// Formats the chat history for better context preservation
const formatMessageHistory = (messages: Message[]) => {
  // Optimize context window usage by being smarter about history
  // Use recency + relevance heuristic
  
  // Always include the last 3 messages for continuity
  let recentMessages = messages.slice(-3);
  
  // If we have more than 10 messages, intelligently select some earlier ones
  if (messages.length > 10) {
    // Add a few messages from earlier in the conversation for context
    // Prioritize messages with similar content to the latest message
    const latestContent = messages[messages.length - 1].content.toLowerCase();
    
    // Select some messages from the middle of the conversation
    const midConversation = messages.slice(3, messages.length - 3);
    
    // Simple relevance heuristic - check for keyword overlap
    // In a real app, this could be more sophisticated
    const selectedMessages = midConversation.filter((msg, i) => {
      if (i % 3 === 0) return true; // Pick every third message as baseline
      
      // Check for content similarity as a simple heuristic
      if (msg.content && latestContent) {
        const msgWords = new Set(msg.content.toLowerCase().split(/\s+/));
        const latestWords = new Set(latestContent.split(/\s+/));
        let overlap = 0;
        
        msgWords.forEach(word => {
          if (latestWords.has(word) && word.length > 3) overlap++;
        });
        
        return overlap > 1; // If there's word overlap, include the message
      }
      return false;
    });
    
    // Combine recent messages with selected relevant ones
    recentMessages = [...selectedMessages.slice(-5), ...recentMessages];
  } else {
    // For shorter conversations, include all messages
    recentMessages = messages;
  }
  
  // Limit to max 8 messages for performance
  if (recentMessages.length > 8) {
    recentMessages = recentMessages.slice(-8);
  }
  
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
  
  return `${modelId}:${content.substring(0, 100)}:${lastContextMessage}`;
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
  const startTime = performance.now();
  perfMetrics.totalCalls++;
  
  try {
    // Check cache first with model-specific TTL
    const cacheKey = generateCacheKey(content, model.id, conversationHistory);
    const cachedResponse = responseCache.get(cacheKey);
    
    const modelTtl = MODEL_SPECIFIC_TTLS[model.id as keyof typeof MODEL_SPECIFIC_TTLS] || DEFAULT_CACHE_TTL;
    
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < cachedResponse.ttl) {
      console.log('Using cached LLM response');
      perfMetrics.cacheHits++;
      
      // Update performance metrics
      const responseTime = performance.now() - startTime;
      perfMetrics.responseTimeTotal += responseTime;
      perfMetrics.averageResponseTime = perfMetrics.responseTimeTotal / perfMetrics.totalCalls;
      
      // Log performance metrics occasionally
      if (perfMetrics.totalCalls % 10 === 0) {
        console.log(`LLM Performance: ${perfMetrics.cacheHits}/${perfMetrics.totalCalls} cache hits, avg response: ${perfMetrics.averageResponseTime.toFixed(2)}ms`);
      }
      
      return cachedResponse.response;
    }
    
    perfMetrics.cacheMisses++;

    // Format conversation history more efficiently
    const messageHistory = formatMessageHistory(conversationHistory);
    
    // Get the last message which might contain images or files
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const images = lastMessage?.images || [];
    
    // Optimize file handling - limit total size
    const MAX_TOTAL_FILE_SIZE = 250000; // bytes
    let totalFileSize = 0;
    let files = lastMessage?.files || [];
    
    if (files.length > 0) {
      // Process files to limit total size
      const processedFiles = [];
      
      for (const file of files) {
        const fileSize = file.length;
        
        // If adding this file would exceed our limit, truncate it
        if (totalFileSize + fileSize > MAX_TOTAL_FILE_SIZE) {
          const remainingSize = MAX_TOTAL_FILE_SIZE - totalFileSize;
          if (remainingSize > 500) { // Only add if we can include something meaningful
            const truncatedFile = file.substring(0, remainingSize) + "\n... (content truncated for performance) ...";
            processedFiles.push(truncatedFile);
          }
          break; // Stop processing files once we hit the limit
        } else {
          processedFiles.push(file);
          totalFileSize += fileSize;
        }
      }
      
      files = processedFiles;
      
      console.log(`Processed ${files.length} files, total size: ~${Math.round(totalFileSize/1024)}KB`);
    }
    
    console.log('Sending message to LLM:', { 
      model: model.name, 
      modelId: model.id, 
      provider: model.provider
    });
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout - reduced from 60
    
    // Create a timeout promise for earlier user notification
    const earlyNotificationTimeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        // Show a gentle notification that we're still working after 4 seconds
        toast({
          title: "Processing your request",
          description: "Getting response from AI model...",
          duration: 3000
        });
        resolve(null);
      }, 4000);
    });
    
    // Start the fetch and early notification in parallel
    await Promise.race([earlyNotificationTimeoutPromise, new Promise(r => setTimeout(r, 100))]);
    
    try {
      // Better error message for timeout
      const showTimeoutMessage = setTimeout(() => {
        toast({
          title: "Response taking longer than usual",
          description: "The AI model is processing your request. This may take a moment...",
          variant: "default",
        });
      }, 12000); // Reduced from 15 to 12 seconds
      
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
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timed out after 40 seconds'));
          });
        })
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
      
      // Cache the successful response with model-specific TTL
      responseCache.set(cacheKey, {
        timestamp: Date.now(),
        response,
        ttl: modelTtl
      });
      
      // Update performance metrics
      const responseTime = performance.now() - startTime;
      perfMetrics.responseTimeTotal += responseTime;
      perfMetrics.averageResponseTime = perfMetrics.responseTimeTotal / perfMetrics.totalCalls;
      
      console.log(`Response generation completed in ${responseTime.toFixed(2)}ms`);
      
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
    const responseTime = performance.now() - startTime;
    console.error(`Error with ${model.provider} API (${responseTime.toFixed(2)}ms):`, error);
    
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
