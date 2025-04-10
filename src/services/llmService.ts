
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";
import { toast } from "@/components/ui/use-toast";

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
    // Format conversation history with better context preservation
    const messageHistory = formatMessageHistory(conversationHistory);
    
    // Get the last message which might contain images or files
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const images = lastMessage?.images || [];
    const files = lastMessage?.files || [];
    
    console.log('Sending message to LLM:', { 
      model: model.name, 
      modelId: model.id, 
      provider: model.provider, 
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      messageHistoryCount: messageHistory.length,
      imagesCount: images.length,
      filesCount: files.length
    });
    
    // Debug log for files
    if (files && files.length > 0) {
      console.log('Files being sent with message:', files.length);
      // Log a preview of the first file
      if (files[0]) {
        const filePreview = files[0].substring(0, 100) + '...';
        console.log('First file preview:', filePreview);
      }
    }
    
    // Debug log to check if the current message appears in the history
    const lastUserMessageInHistory = messageHistory
      .filter(msg => msg.role === 'user')
      .pop();
      
    if (lastUserMessageInHistory) {
      console.log('Last user message in history:', {
        content: lastUserMessageInHistory.content.substring(0, 50) + 
                (lastUserMessageInHistory.content.length > 50 ? '...' : ''),
        hasImages: lastUserMessageInHistory.images && lastUserMessageInHistory.images.length > 0,
        hasFiles: lastUserMessageInHistory.files && lastUserMessageInHistory.files.length > 0
      });
    }
    
    // Call the Supabase Edge Function with retries for better reliability
    let attempts = 0;
    const maxAttempts = 3; // Increase the number of retry attempts
    let lastError;
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            model,
            content,
            messages: messageHistory,
            images,  // Pass images for API compatibility
            files    // Pass files for file search
          }
        });
        
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
        
        console.log('Received response from LLM:', {
          contentPreview: data.content ? (data.content.substring(0, 50) + (data.content.length > 50 ? '...' : '')) : 'No content',
          model: data.model,
          provider: data.provider,
          tokens: data.tokens,
          hasWebSearchResults: !!data.webSearchResults && data.webSearchResults.length > 0,
          hasFileSearchResults: !!data.fileSearchResults && data.fileSearchResults.length > 0
        });
        
        if (data.webSearchResults && data.webSearchResults.length > 0) {
          console.log('Web search results:', JSON.stringify(data.webSearchResults).substring(0, 200) + '...');
        }
        
        if (data.fileSearchResults && data.fileSearchResults.length > 0) {
          console.log('File search results:', JSON.stringify(data.fileSearchResults).substring(0, 200) + '...');
        }
        
        // If content is empty but we have search results, create a placeholder message
        if (!data.content && (data.webSearchResults?.length > 0 || data.fileSearchResults?.length > 0)) {
          data.content = "I'm currently searching for information related to your request. The results will be processed shortly.";
        }
        
        // Ensure we always have some content
        if (!data.content) {
          data.content = "I'm processing your request. Please wait a moment for the full response.";
        }
        
        return {
          content: data.content,
          tokens: data.tokens || { input: 0, output: 0 },
          webSearchResults: data.webSearchResults || [],
          fileSearchResults: data.fileSearchResults || []
        };
      } catch (error) {
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
