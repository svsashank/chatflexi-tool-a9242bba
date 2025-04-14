
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatStore } from './types';
import { AIModel } from '@/types';
import { 
  addMessageAction,
  createSendMessageAction,
  createRegenerateMessageAction,
  selectModelAction
} from './actions';
import { createConversationAction, setCurrentConversationIdAction, deleteConversationAction } from './conversationActions';

const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  selectedModel: AI_MODELS[0], // default to the first model
  processingUrls: null, // URL processing state
  
  // Actions that don't depend on other actions
  setCurrentConversationId: setCurrentConversationIdAction(set, get),
  setSelectedModel: selectModelAction(set),
  setProcessingUrls: (message: string | null) => set({ processingUrls: message }), // Add this method
  
  // Message Actions
  addMessage: addMessageAction(set, get),
  
  // Async Actions (must be defined after all state properties)
  generateResponse: async () => {
    const { generateResponseAction } = await import('./actions/responseActions');
    return generateResponseAction(set, get)();
  },
  sendMessage: createSendMessageAction(set, get),
  regenerateMessage: createRegenerateMessageAction(set, get),
  
  // Conversation Actions
  createConversation: createConversationAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  updateConversationTitle: async (id: string, title: string) => {
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === id ? { ...conv, title: title } : conv
      ),
    }));
  },
  
  // Database Actions
  loadConversationsFromDB: async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn("No user ID found, skipping database load");
        return;
      }
      
      console.log("Loading conversations from database for user:", userId);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }
      
      if (data) {
        const loadedConversations = data.map(dbConversation => ({
          id: dbConversation.id,
          title: dbConversation.title,
          messages: [], // Messages will be loaded separately
          createdAt: new Date(dbConversation.created_at),
          updatedAt: new Date(dbConversation.updated_at),
          contextSummary: null,
        }));
        
        set({ conversations: loadedConversations });
        
        if (loadedConversations.length > 0 && !get().currentConversationId) {
          set({ currentConversationId: loadedConversations[0].id });
        }
        
        console.log(`Successfully loaded ${loadedConversations.length} conversations from database`);
      }
    } catch (error) {
      console.error("Error loading conversations from database:", error);
      throw error;
    }
  },
  
  loadMessagesForConversation: async (conversationId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn("No user ID found, skipping database load");
        return;
      }
      
      console.log(`Loading messages for conversation ${conversationId} for user:`, userId);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }
      
      if (data) {
        const loadedMessages = data.map(dbMessage => ({
          id: dbMessage.id,
          content: dbMessage.content,
          role: dbMessage.role,
          model: {
            id: dbMessage.model_id,
            name: dbMessage.model_id, // You might want to fetch the actual model details
            provider: dbMessage.model_provider,
          },
          timestamp: new Date(dbMessage.created_at),
          tokens: {
            input: dbMessage.input_tokens || 0,
            output: dbMessage.output_tokens || 0,
          },
          computeCredits: dbMessage.compute_credits || 0,
          webSearchResults: dbMessage.web_search_results || [],
          fileSearchResults: dbMessage.file_search_results || [],
          images: dbMessage.images || [],
        }));
        
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, messages: loadedMessages } : conv
          ),
        }));
        
        console.log(`Successfully loaded ${loadedMessages.length} messages for conversation ${conversationId}`);
      }
    } catch (error) {
      console.error("Error loading messages from database:", error);
      throw error;
    }
  },
  clearConversations: () => set({ conversations: [], currentConversationId: null }),
}));

// Make sure to import AI_MODELS here
import { AI_MODELS } from '@/constants';

// Export the store
export { useChatStore };
