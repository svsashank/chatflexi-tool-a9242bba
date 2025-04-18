
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Message, AIModel, Conversation } from "@/types";
import { ChatStore } from "../types";

// Track which conversations have already had their messages loaded
const loadedMessagesCache = new Set<string>();

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
      const loadedConversations = data.map((dbConversation: any) => ({
        id: dbConversation.id,
        title: dbConversation.title,
        messages: [], // Messages will be loaded separately when needed
        createdAt: new Date(dbConversation.created_at),
        updatedAt: new Date(dbConversation.updated_at),
        contextSummary: '',
      }));
      
      set({ conversations: loadedConversations });
      
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
    
    // Check if we already have messages for this conversation
    const existingConversation = get().conversations.find(c => c.id === conversationId);
    if (existingConversation?.messages?.length > 0) {
      console.log(`Already have ${existingConversation.messages.length} messages for conversation ${conversationId}, skipping load`);
      loadedMessagesCache.add(conversationId);
      return;
    }
    
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
      
      // Mark this conversation as having its messages loaded
      loadedMessagesCache.add(conversationId);
      
      console.log(`Updated state with ${formattedMessages.length} messages for conversation ${conversationId}`);
    } else {
      console.log(`No messages found for conversation ${conversationId}`);
      loadedMessagesCache.add(conversationId);
    }
  } catch (error) {
    console.error(`Error in loadMessagesForConversation:`, error);
    toast({
      title: 'Error',
      description: 'Failed to load messages',
      variant: 'destructive',
    });
  }
};
