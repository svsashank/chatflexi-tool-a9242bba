
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Message, AIModel, Conversation } from "@/types";
import { ChatStore } from "./types";

export const loadConversationsFromDBAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || localStorage.getItem('userId');
    
    if (!userId) {
      console.warn("No user ID found, skipping database load");
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
    toast({
      title: 'Error',
      description: 'Failed to load conversations',
      variant: 'destructive',
    });
  }
};

export const loadMessagesForConversationAction = (set: Function) => async (conversationId: string) => {
  try {
    if (!conversationId) {
      console.log("No conversation ID provided, skipping message load");
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
          console.log(`Found ${message.images.length} images for message ${message.id}`);
        }
        
        if (message.web_search_results) {
          formattedMessage.webSearchResults = message.web_search_results;
          console.log(`Found web search results for message ${message.id}:`, 
            JSON.stringify(message.web_search_results).substring(0, 100) + '...');
        }
        
        if (message.file_search_results) {
          formattedMessage.fileSearchResults = message.file_search_results;
          console.log(`Found file search results for message ${message.id}`);
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
  } catch (error) {
    console.error(`Error in loadMessagesForConversation:`, error);
    toast({
      title: 'Error',
      description: 'Failed to load messages',
      variant: 'destructive',
    });
  }
};
