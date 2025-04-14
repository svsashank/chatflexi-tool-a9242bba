
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatStore } from './types';
import { AIModel, Conversation, Message } from '@/types';
import { 
  addMessageAction,
  createSendMessageAction,
  createRegenerateMessageAction,
  selectModelAction
} from './actions';
import { createConversationAction, setCurrentConversationIdAction, deleteConversationAction } from './conversationActions';

// Import AI_MODELS
import { AI_MODELS } from '@/constants';

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  selectedModel: AI_MODELS[0], // default to the first model
  processingUrls: null, // URL processing state
  
  // Actions that don't depend on other actions
  setCurrentConversationId: setCurrentConversationIdAction(set, get),
  setSelectedModel: selectModelAction(set),
  setProcessingUrls: (message: string | null) => set({ processingUrls: message }),
  
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
          contextSummary: '',
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
        const loadedMessages: Message[] = data.map(dbMessage => {
          // Create a properly typed message object
          const message: Message = {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role as 'user' | 'assistant' | 'system',
            model: {
              id: dbMessage.model_id || '',
              name: dbMessage.model_id || '', 
              provider: dbMessage.model_provider || '',
              description: '',
              capabilities: ['text'] as Array<'text' | 'images' | 'code' | 'audio'>,
              avatarColor: '#808080'
            },
            timestamp: new Date(dbMessage.created_at),
          };

          // Add tokens if available
          if (dbMessage.input_tokens !== null && dbMessage.output_tokens !== null) {
            message.tokens = {
              input: dbMessage.input_tokens || 0,
              output: dbMessage.output_tokens || 0,
            };
          }
          
          // Add compute credits if available
          if (dbMessage.compute_credits !== null) {
            message.computeCredits = dbMessage.compute_credits;
          }
          
          // Add images if available
          if (dbMessage.images && Array.isArray(dbMessage.images) && dbMessage.images.length > 0) {
            message.images = dbMessage.images;
          }
          
          // Add files if available
          if (dbMessage.files && Array.isArray(dbMessage.files) && dbMessage.files.length > 0) {
            message.files = dbMessage.files;
          }
          
          // Ensure web search results are always arrays
          if (dbMessage.web_search_results) {
            message.webSearchResults = Array.isArray(dbMessage.web_search_results) 
              ? dbMessage.web_search_results 
              : [];
          } else {
            message.webSearchResults = [];
          }
          
          // Ensure file search results are always arrays
          if (dbMessage.file_search_results) {
            message.fileSearchResults = Array.isArray(dbMessage.file_search_results)
              ? dbMessage.file_search_results
              : [];
          } else {
            message.fileSearchResults = [];
          }
          
          return message;
        });
        
        // Update the state with properly typed messages
        set((state: ChatStore) => ({
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
