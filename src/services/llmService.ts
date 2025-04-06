
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";

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
    images: msg.images || []
  }));
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
  }
}> => {
  try {
    // Format conversation history with better context preservation
    const messageHistory = formatMessageHistory(conversationHistory);
    
    // Get the last message which might contain images
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const images = lastMessage?.images || [];
    
    console.log('Sending message to LLM:', { 
      model: model.name, 
      modelId: model.id, 
      provider: model.provider, 
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      messageHistoryCount: messageHistory.length,
      imagesCount: images.length
    });
    
    // Debug log to check if the current message appears in the history
    const lastUserMessageInHistory = messageHistory
      .filter(msg => msg.role === 'user')
      .pop();
      
    if (lastUserMessageInHistory) {
      console.log('Last user message in history:', {
        content: lastUserMessageInHistory.content.substring(0, 50) + 
                (lastUserMessageInHistory.content.length > 50 ? '...' : ''),
        hasImages: lastUserMessageInHistory.images && lastUserMessageInHistory.images.length > 0
      });
    }
    
    // Call the Supabase Edge Function with retries for better reliability
    let attempts = 0;
    const maxAttempts = 2;
    let lastError;
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            model,
            content,
            messages: messageHistory,
            images  // Pass images for API compatibility
          }
        });
        
        if (error) {
          console.error(`Attempt ${attempts + 1}: Error with ${model.provider} API:`, error);
          lastError = error;
          attempts++;
          // Wait before retry
          if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        console.log('Received response from LLM:', {
          contentPreview: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
          model: data.model,
          provider: data.provider,
          tokens: data.tokens
        });
        
        return {
          content: data.content,
          tokens: data.tokens
        };
      } catch (error) {
        console.error(`Attempt ${attempts + 1}: Error with ${model.provider} API:`, error);
        lastError = error;
        attempts++;
        // Wait before retry
        if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If we get here, all attempts failed
    return {
      content: `Error: ${lastError?.message || 'Failed to get response after multiple attempts'}`,
      tokens: { input: 0, output: 0 }
    };
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    return {
      content: `Error: ${error.message || 'Failed to get response from model'}`,
      tokens: { input: 0, output: 0 }
    };
  }
};
