
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";
import { toast } from "sonner";

// Removed overly complex caching and context selection logic
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

  try {
    // Simplified message history formatting
    const messageHistory = conversationHistory.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const images = lastMessage?.images || [];
    const files = lastMessage?.files || [];

    console.log('Sending message to LLM:', { 
      modelName: model.name, 
      modelId: model.id, 
      contentLength: content.length,
      imagesCount: images.length,
      filesCount: files.length
    });

    const result = await supabase.functions.invoke('chat', {
      body: { 
        model,
        content,
        messages: messageHistory,
        images,
        files
      }
    });

    const { data, error } = result as { data: any, error: any };
    
    if (error) {
      console.error(`Error with ${model.provider} API:`, error);
      throw error;
    }

    const response = {
      content: data.content || "I couldn't generate a response. Please try again.",
      tokens: data.tokens || { input: 0, output: 0 },
      webSearchResults: data.webSearchResults || [],
      fileSearchResults: data.fileSearchResults || []
    };

    const responseTime = performance.now() - startTime;
    console.log(`Response generation time: ${responseTime.toFixed(2)}ms`);

    return response;
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    
    // Fix: Use correct toast format for sonner
    toast.error(error.message || 'An unexpected error occurred');

    return {
      content: `Error: ${error.message || 'Failed to get response from model'}. Please try again.`,
      tokens: { input: 0, output: 0 }
    };
  }
};
