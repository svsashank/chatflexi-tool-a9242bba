import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation, ChatState, AIModel } from '../types';
import { AI_MODELS, DEFAULT_MODEL } from '../constants';
import { sendMessageToLLM } from '../services/llmService';

const useChatStore = create<ChatState & {
  createConversation: () => void;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (content: string) => void;
  selectModel: (model: AIModel) => void;
  generateResponse: () => Promise<void>;
}>((set, get) => {
  // Create an initial conversation
  const initialConversation: Conversation = {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    contextSummary: '',
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
        contextSummary: '',
      };

      set((state) => ({
        conversations: [...state.conversations, newConversation],
        currentConversationId: newConversation.id,
      }));
    },

    setCurrentConversation: (id: string) => {
      set({ currentConversationId: id });
    },

    deleteConversation: (id: string) => {
      const { conversations, currentConversationId } = get();
      
      // Don't delete if it's the only conversation
      if (conversations.length <= 1) return;
      
      const updatedConversations = conversations.filter(conv => conv.id !== id);
      
      // If the deleted conversation was the current one, set a new current
      const newCurrentId = id === currentConversationId 
        ? updatedConversations[0].id 
        : currentConversationId;
      
      set({
        conversations: updatedConversations,
        currentConversationId: newCurrentId,
      });
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
          
          // Add message and update context summary
          const updatedConv = {
            ...conv,
            title,
            messages: [...conv.messages, message],
            updatedAt: new Date(),
            // Update context summary with the new message
            contextSummary: updateContextSummary(conv.contextSummary, message),
          };
          
          return updatedConv;
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

    generateResponse: async () => {
      const { conversations, currentConversationId, selectedModel } = get();
      
      if (!currentConversationId) return;

      const currentConversation = conversations.find(
        (conv) => conv.id === currentConversationId
      );

      if (!currentConversation) return;
      
      try {
        // Get the last user message
        const lastUserMessage = [...currentConversation.messages]
          .reverse()
          .find(m => m.role === 'user');
        
        if (!lastUserMessage) return;
        
        // Get response from the selected LLM
        const responseText = await sendMessageToLLM(
          lastUserMessage.content, 
          selectedModel,
          currentConversation.messages
        );

        const assistantMessage: Message = {
          id: uuidv4(),
          content: responseText,
          role: 'assistant',
          model: selectedModel,
          timestamp: new Date(),
        };

        const updatedConversations = conversations.map((conv) => {
          if (conv.id === currentConversationId) {
            // Update conversation with assistant's response and context
            return {
              ...conv,
              messages: [...conv.messages, assistantMessage],
              updatedAt: new Date(),
              // Update context summary with assistant's response
              contextSummary: updateContextSummary(conv.contextSummary, assistantMessage),
            };
          }
          return conv;
        });

        set({
          conversations: updatedConversations,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error generating response:", error);
        
        // Add error message to the conversation
        const errorMessage: Message = {
          id: uuidv4(),
          content: `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`,
          role: 'assistant',
          model: selectedModel,
          timestamp: new Date(),
        };
        
        const updatedConversations = conversations.map((conv) => {
          if (conv.id === currentConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, errorMessage],
              updatedAt: new Date(),
            };
          }
          return conv;
        });
        
        set({
          conversations: updatedConversations,
          isLoading: false,
        });
      }
    },
  };
});

// Helper function to update context summary
const updateContextSummary = (currentSummary: string, message: Message): string => {
  // For simplicity, we'll just keep a running list of the last few interactions
  // In a more advanced system, you could use an LLM to generate a proper summary
  const role = message.role === 'user' ? 'User' : 'Krix';
  const newEntry = `${role}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`;
  
  // Split by lines, add new entry, and keep only the last 5 entries
  const summaryLines = currentSummary ? currentSummary.split('\n') : [];
  summaryLines.push(newEntry);
  
  return summaryLines.slice(-5).join('\n');
};

export default useChatStore;
