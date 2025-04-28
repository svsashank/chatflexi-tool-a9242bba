
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Message, AIModel, Conversation } from "@/types";
import { ChatStore } from "../types";

// Global cache that persists between component renders
const conversationsLoadState = {
  loaded: false,
  loading: false,
  lastError: null,
  lastLoadTime: 0
};

// Track which conversations have already had their messages loaded
const loadedMessagesCache = new Set<string>();
// Track pending load requests to prevent duplicates
const pendingLoads = new Map<string, Promise<void>>();

// How frequently we should allow refreshing data from the database (in milliseconds)
const REFRESH_THRESHOLD = 60000; // 1 minute

export const loadConversationsFromDBAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    // Prevent multiple simultaneous calls
    if (conversationsLoadState.loading) {
      console.log("Already loading conversations, ignoring duplicate request");
      return;
    }
    
    // Check if we loaded recently and don't need to reload
    const now = Date.now();
    const timeSinceLastLoad = now - conversationsLoadState.lastLoadTime;
    
    if (conversationsLoadState.loaded && 
        timeSinceLastLoad < REFRESH_THRESHOLD && 
        get().conversations.length > 0) {
      console.log(`Conversations were loaded ${timeSinceLastLoad}ms ago, skipping reload`);
      return;
    }
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      console.warn("No user ID found, skipping database load");
      return;
    }
    
    // Set loading state
    conversationsLoadState.loading = true;
    console.log("Loading conversations from database for user:", userId);
    
    // Use efficient query with pagination if there are many conversations
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50); // Limit to most recent 50 conversations for better performance
    
    if (error) {
      console.error("Error fetching conversations:", error);
      conversationsLoadState.lastError = error;
      conversationsLoadState.loading = false;
      toast.error('Failed to load conversations');
      return;
    }
    
    if (data) {
      const loadedConversations = data.map((dbConversation: any) => ({
        id: dbConversation.id,
        title: dbConversation.title,
        messages: [], // Messages will be loaded separately when needed
        createdAt: new Date(dbConversation.created_at),
        updatedAt: new Date(dbConversation.updated_at),
        contextSummary: '',
      }));
      
      // Set conversations in the store
      set({ conversations: loadedConversations });
      
      // Setup the current conversation if we have conversations but no currentId
      if (loadedConversations.length > 0 && !get().currentConversationId) {
        set({ currentConversationId: loadedConversations[0].id });
        
        // Preload messages for the first conversation for better UX
        try {
          await loadMessagesForConversationAction(set, get)(loadedConversations[0].id);
        } catch (msgError) {
          console.error("Failed to preload messages for first conversation:", msgError);
        }
      }
      
      // Update loading state
      conversationsLoadState.loaded = true;
      conversationsLoadState.lastLoadTime = now;
      conversationsLoadState.loading = false;
      console.log(`Successfully loaded ${loadedConversations.length} conversations from database`);
    } else {
      // Handle case where no conversations were found
      conversationsLoadState.loaded = true;
      conversationsLoadState.lastLoadTime = now;
      conversationsLoadState.loading = false;
      console.log("No conversations found in database");
    }
  } catch (error) {
    console.error("Error loading conversations from database:", error);
    conversationsLoadState.lastError = error;
    conversationsLoadState.loading = false;
    toast.error('Failed to load conversations');
  }
};

export const loadMessagesForConversationAction = (set: Function, get: () => ChatStore) => async (conversationId: string) => {
  try {
    if (!conversationId) {
      console.log("No conversation ID provided, skipping message load");
      return;
    }
    
    // Check if we've already loaded messages for this conversation in this session
    if (loadedMessagesCache.has(conversationId)) {
      const existingMessages = get().conversations.find(c => c.id === conversationId)?.messages;
      if (existingMessages?.length > 0) {
        console.log(`Already loaded ${existingMessages.length} messages for conversation ${conversationId}, using cached data`);
        return;
      } else {
        console.log(`Cache marked messages as loaded but none found, reloading for conversation ${conversationId}`);
      }
    }
    
    // Check if we're already loading messages for this conversation
    if (pendingLoads.has(conversationId)) {
      console.log(`Already loading messages for conversation ${conversationId}, waiting for completion`);
      try {
        await pendingLoads.get(conversationId);
        return;
      } catch (e) {
        console.error("Error waiting for pending load:", e);
        // Continue with a fresh load attempt
      }
    }
    
    // Create a promise for this load operation
    const loadPromise = (async () => {
      console.log(`Loading messages for conversation ${conversationId}...`);
      
      // Use a timeout to prevent infinite waiting
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Message loading timed out")), 10000);
      });
      
      // The actual database query
      const queryPromise = supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      // Race the timeout against the actual query
      const { data: messages, error } = await Promise.race([
        queryPromise,
        timeoutPromise.then(() => { throw new Error("Message loading timed out"); })
      ]) as any;
      
      if (error) {
        console.error(`Error loading messages for conversation ${conversationId}:`, error);
        toast.error('Failed to load messages');
        return;
      }
      
      console.log(`Loaded ${messages?.length || 0} messages for conversation ${conversationId}`);
      
      if (messages && messages.length > 0) {
        const formattedMessages = messages.map((message: any) => {
          const model: AIModel = {
            id: message.model_id || 'unknown',
            name: message.model_id || 'unknown',
            provider: message.model_provider || 'unknown',
            description: '',
            capabilities: ['text'],
            avatarColor: '#9b87f5',
            responseSpeed: 'medium',  // Add required property
            pricing: 'standard'       // Add required property
          };
          
          const formattedMessage: Message = {
            id: message.id,
            content: message.content,
            role: message.role,
            model: model,
            timestamp: new Date(message.created_at),
            tokens: message.input_tokens && message.output_tokens
              ? { input: message.input_tokens, output: message.output_tokens }
              : undefined,
            computeCredits: message.compute_credits,
          };
          
          if (message.images && message.images.length > 0) {
            formattedMessage.images = message.images;
          }
          
          if (message.web_search_results) {
            formattedMessage.webSearchResults = message.web_search_results;
          }
          
          if (message.file_search_results) {
            formattedMessage.fileSearchResults = message.file_search_results;
          }
          
          return formattedMessage;
        });
        
        // Check if the conversation still exists in state before updating
        if (get().conversations.some(conv => conv.id === conversationId)) {
          set((state: any) => ({
            conversations: state.conversations.map((conv: Conversation) =>
              conv.id === conversationId
                ? { ...conv, messages: formattedMessages }
                : conv
            ),
          }));
          
          console.log(`Updated state with ${formattedMessages.length} messages for conversation ${conversationId}`);
        } else {
          console.warn(`Conversation ${conversationId} no longer exists in state, skipping message update`);
        }
      } else {
        console.log(`No messages found for conversation ${conversationId}`);
      }
      
      // Mark this conversation as having its messages loaded whether we found messages or not
      loadedMessagesCache.add(conversationId);
    })();
    
    // Store the promise
    pendingLoads.set(conversationId, loadPromise);
    
    // Wait for it to complete
    try {
      await loadPromise;
    } catch (error) {
      console.error(`Error loading messages for conversation ${conversationId}:`, error);
      toast.error('Failed to load messages');
    } finally {
      // Remove from pending loads
      pendingLoads.delete(conversationId);
    }
    
  } catch (error) {
    console.error(`Error in loadMessagesForConversation:`, error);
    // Remove from pending loads in case of error
    pendingLoads.delete(conversationId);
    
    toast.error('Failed to load messages');
  }
};

// Explicitly clear the conversation cache
export const clearConversationCache = () => {
  conversationsLoadState.loaded = false;
  conversationsLoadState.lastLoadTime = 0;
  loadedMessagesCache.clear();
  pendingLoads.clear();
  console.log("Conversation cache cleared");
};

// Add this action to the store
export const refreshConversationsAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    // Force refresh by clearing cache first
    clearConversationCache();
    
    // Then reload
    await loadConversationsFromDBAction(set, get)();
    
    // If we have a current conversation, reload its messages
    const currentId = get().currentConversationId;
    if (currentId) {
      await loadMessagesForConversationAction(set, get)(currentId);
    }
    
    toast.success("Conversations refreshed");
  } catch (error) {
    console.error("Error refreshing conversations:", error);
    toast.error("Failed to refresh conversations");
  }
};
