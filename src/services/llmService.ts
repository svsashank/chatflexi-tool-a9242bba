
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
    reasoning?: number; // Added reasoning tokens
  };
  webSearchResults?: any[];
  fileSearchResults?: any[];
  reasoningContent?: string; // Added reasoning content
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

    // Add reasoning parameters for O-series models
    const extraParams: any = {};
    const isOSeries = model.id.startsWith('o') || model.id.includes('/o');
    
    if (isOSeries) {
      // Set reasoning effort based on model setting or default to high
      const reasoningEffort = model.reasoningEffort || 'high';
      const showReasoning = model.showReasoning ?? true; // Default to showing reasoning
      
      extraParams.reasoning = {
        effort: reasoningEffort,
        exclude: !showReasoning
      };
      
      console.log(`Using O-series model with reasoning: ${reasoningEffort}, show: ${showReasoning}`);
    }

    console.log('Sending message to LLM:', { 
      modelName: model.name, 
      modelId: model.id, 
      contentLength: content.length,
      imagesCount: images.length,
      filesCount: files.length,
      reasoning: isOSeries ? extraParams.reasoning : undefined
    });

    const result = await supabase.functions.invoke('chat', {
      body: { 
        model,
        content,
        messages: messageHistory,
        images,
        files,
        ...extraParams
      }
    });

    const { data, error } = result as { data: any, error: any };
    
    if (error) {
      console.error(`Error with ${model.provider} API:`, error);
      throw error;
    }

    const response = {
      content: data.content || "I couldn't generate a response. Please try again.",
      tokens: {
        input: data.tokens?.input || 0,
        output: data.tokens?.output || 0,
        reasoning: data.tokens?.reasoning
      },
      webSearchResults: data.webSearchResults || [],
      fileSearchResults: data.fileSearchResults || [],
      reasoningContent: data.reasoningContent
    };

    const responseTime = performance.now() - startTime;
    console.log(`Response generation time: ${responseTime.toFixed(2)}ms`);
    console.log(`Token counts - Input: ${response.tokens.input}, Output: ${response.tokens.output}, Reasoning: ${response.tokens.reasoning || 0}`);

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
