
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";

// Sends a message to the specified model via Supabase Edge Function
export const sendMessageToLLM = async (
  content: string,
  model: AIModel,
  conversationHistory: Message[]
): Promise<string> => {
  try {
    // Format conversation history in a simplified format for the edge function
    const messageHistory = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { 
        model,
        content,
        messages: messageHistory
      }
    });
    
    if (error) {
      console.error(`Error with ${model.provider} API:`, error);
      return `Error: ${error.message || 'Failed to get response from model'}`;
    }
    
    return data.content;
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    return `Error: ${error.message || 'Failed to get response from model'}`;
  }
};

// Fallback mock responses if needed
const getMockResponse = (modelId: string): string => {
  const mockResponses: Record<string, string> = {
    'gpt-4o': "I'm GPT-4o, OpenAI's most advanced model. I can help with complex reasoning, creative tasks, and analyze images. How can I assist you today?",
    'claude-3-opus': "Hello! I'm Claude 3 Opus by Anthropic. I excel at thoughtful analysis, creative writing, and can understand images. What would you like to explore?",
    'gemini-pro': "Hi there, I'm Google's Gemini Pro. I'm designed to handle a wide range of tasks including text, code, and images. How can I help you?",
    'llama-3': "Greetings! I'm Llama 3 from Meta. I'm an open model focused on helpful, harmless, and honest AI assistance. What questions do you have?",
    'mixtral-8x7b': "Hello! I'm Mixtral 8x7B developed by Mistral AI. I'm a mixture-of-experts model with strong capabilities across multiple languages and domains. How may I assist you?"
  };
  
  return mockResponses[modelId] || "I'll help you with that request.";
};
