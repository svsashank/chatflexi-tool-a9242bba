
import { supabase } from "@/integrations/supabase/client";
import { Message, AIModel } from "@/types";

// Formats the chat history for better context preservation
const formatMessageHistory = (messages: Message[]) => {
  // Only include the last 10 messages to avoid token limits
  const recentMessages = messages.slice(-10);
  
  // Clean the messages to remove any internal notes or system prompts
  return recentMessages.map(msg => {
    let cleanContent = msg.content;
    
    // Remove any content between <think> and </think> tags
    cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any system prompt text that might have been captured
    if (cleanContent.includes("You are Krix, a helpful AI assistant")) {
      cleanContent = cleanContent.replace(/You are Krix, a helpful AI assistant[^"]*/g, '');
    }
    
    // Trim any whitespace
    cleanContent = cleanContent.trim();
    
    return {
      role: msg.role,
      content: cleanContent,
      // Include model info for better context
      model: msg.model.name
    };
  });
};

// Sends a message to the specified model via Supabase Edge Function
export const sendMessageToLLM = async (
  content: string,
  model: AIModel,
  conversationHistory: Message[]
): Promise<string> => {
  try {
    // Format conversation history with better context preservation
    const messageHistory = formatMessageHistory(conversationHistory);
    
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
    
    // For DeepSeek models, preserve the thinking tags in the response
    // For other models, return the response as-is
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
    'mixtral-8x7b': "Hello! I'm Mixtral 8x7B developed by Mistral AI. I'm a mixture-of-experts model with strong capabilities across multiple languages and domains. How may I assist you?",
    'deepseek-r1': "<think>The user is asking me to introduce myself. I should provide a helpful and informative response that explains my capabilities while being conversational but not overly verbose.\n\nFirst, I'll mention that I'm DeepSeek-R1 and that I'm accessed through Krutrim.\n\nThen, I'll highlight some of my key capabilities:\n- Designed for thoughtful responses\n- Strong at reasoning and language understanding\n- Capable of helping with various tasks\n\nI should keep my response friendly and approachable.</think>\n\nHello! I'm DeepSeek-R1 accessed through Krutrim. I'm designed to provide thoughtful, accurate responses with strong reasoning capabilities. I can help with questions, creative tasks, information retrieval, and more. What would you like to know today?"
  };
  
  return mockResponses[modelId] || "I'll help you with that request.";
};
