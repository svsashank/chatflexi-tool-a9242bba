
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";

// Formats the chat history for better context preservation
const formatMessageHistory = (messages: Message[]) => {
  // Only include the last 10 messages to avoid token limits
  const recentMessages = messages.slice(-10);
  
  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
    // Include model info for better context
    model: msg.model.name,
    // Include images if they exist
    images: msg.images
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
      
      // Check if the current message is already in history
      if (lastUserMessageInHistory.content === content) {
        console.warn('WARNING: Current message appears to be duplicated in history!');
      }
    }
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { 
        model,
        content,
        messages: messageHistory,
        images // Pass images separately for API compatibility
      }
    });
    
    if (error) {
      console.error(`Error with ${model.provider} API:`, error);
      return {
        content: `Error: ${error.message || 'Failed to get response from model'}`,
        tokens: { input: 0, output: 0 }
      };
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
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    return {
      content: `Error: ${error.message || 'Failed to get response from model'}`,
      tokens: { input: 0, output: 0 }
    };
  }
};

// Fallback mock responses if needed
const getMockResponse = (modelId: string): string => {
  const mockResponses: Record<string, string> = {
    'gpt-4o': "I'm GPT-4o, OpenAI's most advanced model. I can help with complex reasoning, creative tasks, and analyze images. How can I assist you today?",
    'claude-3-opus': "Hello! I'm Claude 3 Opus by Anthropic. I excel at thoughtful analysis, creative writing, and can understand images. What would you like to explore?",
    'gemini-pro': "Hi there, I'm Google's Gemini Pro. I'm designed to handle a wide range of tasks including text, code, and images. How can I help you?",
    'llama-3': "Greetings! I'm Llama 3 from Meta. I'm an open model focused on helpful, harmless, and honest AI assistance. What questions do you have?",
    'mixtral-8x7b': "Hello! I'm Mixtral 8x7B developed by Mistral AI. I'm a mixture-of-experts model with strong capabilities across multiple languages and domains. How may I assist you?",
    'deepseek-r1': "Hello! I'm DeepSeek-R1 accessed through Krutrim. I'm designed to provide thoughtful, accurate responses. What would you like to know?",
    'o1': "Hello! I'm o1, OpenAI's reasoning model. I'm designed to provide thoughtful responses with robust reasoning. How may I help you today?",
    'o1-mini': "Hi there! I'm o1-mini, a compact version of OpenAI's reasoning model. I can help solve problems with structured reasoning. What would you like to explore?",
    'o3-mini': "Hello! I'm o3-mini, OpenAI's third-generation reasoning model. I can provide logical and thoughtful responses to your questions. How can I assist you?",
    'o1-pro': "Greetings! I'm o1-pro, OpenAI's premium reasoning model. I'm designed for advanced problem-solving and detailed analysis. What would you like me to help with?"
  };
  
  return mockResponses[modelId] || "I'll help you with that request.";
};
