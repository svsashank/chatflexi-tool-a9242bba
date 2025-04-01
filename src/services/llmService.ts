
import useChatStore from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { AIModel, Message } from "@/types";

// Simplified API interfaces for each provider
export const sendMessageToLLM = async (
  content: string,
  model: AIModel,
  conversationHistory: Message[]
): Promise<string> => {
  const { apiKeys } = useSettingsStore.getState();
  
  // Create message history in the format the APIs expect
  const messageHistory = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Add the current message
  const messages = [
    ...messageHistory,
    { role: 'user', content }
  ];
  
  try {
    switch(model.provider.toLowerCase()) {
      case 'openai':
        return await sendToOpenAI(messages, model.id, apiKeys.openai);
      case 'anthropic':
        return await sendToAnthropic(messages, model.id, apiKeys.anthropic);
      case 'google':
        return await sendToGoogle(messages, model.id, apiKeys.google);
      case 'meta':
        // Meta models are typically accessed via other APIs
        return "Meta models are not directly supported yet.";
      case 'mistral':
        // Placeholder for future Mistral API integration
        return "Mistral models are not directly supported yet.";
      case 'xai':
        return await sendToXAI(messages, model.id, apiKeys.xai);
      default:
        // Fallback to the mock response
        return getMockResponse(model.id);
    }
  } catch (error: any) {
    console.error(`Error with ${model.provider} API:`, error);
    return `Error: ${error.message || 'Failed to get response from model'}`;
  }
};

// OpenAI API implementation
const sendToOpenAI = async (messages: any[], modelId: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured. Please add it in Settings.");
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
};

// Anthropic (Claude) API implementation
const sendToAnthropic = async (messages: any[], modelId: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured. Please add it in Settings.");
  }
  
  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelId,
      messages: anthropicMessages,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
};

// Google (Gemini) API implementation
const sendToGoogle = async (messages: any[], modelId: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Google API key is not configured. Please add it in Settings.");
  }

  // Format messages for Gemini API
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

// xAI (Grok) API implementation
const sendToXAI = async (messages: any[], modelId: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("xAI API key is not configured. Please add it in Settings.");
  }
  
  // This is a placeholder as xAI's API details may vary
  const response = await fetch('https://api.xai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `xAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
};

// Mock responses for fallback
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
