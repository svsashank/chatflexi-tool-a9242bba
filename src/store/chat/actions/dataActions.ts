
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Message, AIModel, Conversation } from "@/types";
import { ChatStore } from "../types";

// Track which conversations have already had their messages loaded
const loadedMessagesCache = new Set<string>();
// Track pending load requests to prevent duplicates
const pendingLoads = new Map<string, Promise<void>>();

export const loadConversationsFromDBAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      console.warn("No user ID found, skipping database load");
      return;
    }
    
    // If we already have conversations, don't reload them
    if (get().conversations.length > 0) {
      console.log("Already have conversations in state, skipping database load");
      return;
    }
    
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
      throw error;
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
        await loadMessagesForConversationAction(set, get)(loadedConversations[0].id);
      }
      
      console.log(`Successfully loaded ${loadedConversations.length} conversations from database`);
    }
  } catch (error) {
    console.error("Error loading conversations from database:", error);
    toast({
      title: 'Error',
      description: 'Failed to load conversations',
      variant: 'destructive',
    });
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
      console.log(`Already loaded messages for conversation ${conversationId} in this session, skipping load`);
      return;
    }
    
    // Check if we're already loading messages for this conversation
    if (pendingLoads.has(conversationId)) {
      console.log(`Already loading messages for conversation ${conversationId}, waiting for completion`);
      await pendingLoads.get(conversationId);
      return;
    }
    
    // Check if we already have messages for this conversation
    const existingConversation = get().conversations.find(c => c.id === conversationId);
    if (existingConversation?.messages?.length > 0) {
      console.log(`Already have ${existingConversation.messages.length} messages for conversation ${conversationId}, skipping load`);
      loadedMessagesCache.add(conversationId);
      return;
    }
    
    // Create a promise for this load operation
    const loadPromise = (async () => {
      console.log(`Loading messages for conversation ${conversationId}...`);
      
      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error(`Error loading messages for conversation ${conversationId}:`, error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
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
            avatarColor: '#9b87f5'
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
        
        set((state: any) => ({
          conversations: state.conversations.map((conv: Conversation) =>
            conv.id === conversationId
              ? { ...conv, messages: formattedMessages }
              : conv
          ),
        }));
        
        console.log(`Updated state with ${formattedMessages.length} messages for conversation ${conversationId}`);
      } else {
        console.log(`No messages found for conversation ${conversationId}`);
      }
      
      // Mark this conversation as having its messages loaded whether we found messages or not
      loadedMessagesCache.add(conversationId);
    })();
    
    // Store the promise
    pendingLoads.set(conversationId, loadPromise);
    
    // Wait for it to complete
    await loadPromise;
    
    // Remove from pending loads
    pendingLoads.delete(conversationId);
    
  } catch (error) {
    console.error(`Error in loadMessagesForConversation:`, error);
    // Remove from pending loads in case of error
    pendingLoads.delete(conversationId);
    
    toast({
      title: 'Error',
      description: 'Failed to load messages',
      variant: 'destructive',
    });
  }
};
