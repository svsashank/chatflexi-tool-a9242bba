import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation, ChatState, AIModel } from '../types';
import { AI_MODELS, DEFAULT_MODEL } from '../constants';

// Mock Assistant Responses for demo
const mockResponses: Record<string, string> = {
  'gpt-4o': "I'm GPT-4o, OpenAI's most advanced model. I can help with complex reasoning, creative tasks, and analyze images. How can I assist you today?",
  'claude-3-opus': "Hello! I'm Claude 3 Opus by Anthropic. I excel at thoughtful analysis, creative writing, and can understand images. What would you like to explore?",
  'gemini-pro': "Hi there, I'm Google's Gemini Pro. I'm designed to handle a wide range of tasks including text, code, and images. How can I help you?",
  'llama-3': "Greetings! I'm Llama 3 from Meta. I'm an open model focused on helpful, harmless, and honest AI assistance. What questions do you have?",
  'mixtral-8x7b': "Hello! I'm Mixtral 8x7B developed by Mistral AI. I'm a mixture-of-experts model with strong capabilities across multiple languages and domains. How may I assist you?"
};

// Example code response
const codeExample = `\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate the first 10 Fibonacci numbers
const fibSequence = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log(fibSequence); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

This recursive implementation of the Fibonacci sequence demonstrates a classic algorithm. For larger values of n, you might want to use dynamic programming to avoid recalculating values.`;

const useChatStore = create<ChatState & {
  createConversation: () => void;
  setCurrentConversation: (id: string) => void;
  addMessage: (content: string) => void;
  selectModel: (model: AIModel) => void;
  generateResponse: () => void;
}>((set, get) => {
  // Create an initial conversation
  const initialConversation: Conversation = {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    conversations: [initialConversation],
    currentConversationId: initialConversation.id,
    selectedModel: DEFAULT_MODEL,
    isLoading: false,

    createConversation: () => {
      const newConversation: Conversation = {
        id: uuidv4(),
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((state) => ({
        conversations: [...state.conversations, newConversation],
        currentConversationId: newConversation.id,
      }));
    },

    setCurrentConversation: (id: string) => {
      set({ currentConversationId: id });
    },

    addMessage: (content: string) => {
      const { conversations, currentConversationId, selectedModel } = get();
      
      if (!currentConversationId) return;

      const message: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        model: selectedModel,
        timestamp: new Date(),
      };

      const updatedConversations = conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          // Update conversation title if it's the first message
          const title = conv.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : conv.title;
          
          return {
            ...conv,
            title,
            messages: [...conv.messages, message],
            updatedAt: new Date(),
          };
        }
        return conv;
      });

      set({
        conversations: updatedConversations,
        isLoading: true,
      });

      // Automatically generate a response after adding a user message
      setTimeout(() => {
        get().generateResponse();
      }, 100);
    },

    selectModel: (model: AIModel) => {
      set({ selectedModel: model });
    },

    generateResponse: () => {
      const { conversations, currentConversationId, selectedModel } = get();
      
      if (!currentConversationId) return;

      const currentConversation = conversations.find(
        (conv) => conv.id === currentConversationId
      );

      if (!currentConversation) return;
      
      // Get the last user message to determine content
      const lastUserMessage = [...currentConversation.messages]
        .reverse()
        .find(m => m.role === 'user');

      // Generate appropriate mock response
      let responseText = mockResponses[selectedModel.id] || "I'll help you with that request.";
      
      // Add code example if query seems code-related
      if (lastUserMessage && (
        lastUserMessage.content.toLowerCase().includes('code') || 
        lastUserMessage.content.toLowerCase().includes('function') ||
        lastUserMessage.content.toLowerCase().includes('program') ||
        lastUserMessage.content.toLowerCase().includes('javascript') ||
        lastUserMessage.content.toLowerCase().includes('fibonacci')
      )) {
        responseText = codeExample;
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        content: responseText,
        role: 'assistant',
        model: selectedModel,
        timestamp: new Date(),
      };

      const updatedConversations = conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return conv;
      });

      // Add a delay to simulate processing
      setTimeout(() => {
        set({
          conversations: updatedConversations,
          isLoading: false,
        });
      }, 800);
    },
  };
});

export default useChatStore;
