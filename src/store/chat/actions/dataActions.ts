import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Message, AIModel, Conversation } from "@/types";
import { ChatStore } from "../types";

export const loadConversationsFromDBAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    // Check for authentication first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("No authenticated user found, skipping database load");
      return;
    }
    
    console.log("Loading conversations from database for user:", session.user.id);
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
      return;
    }
    
    if (data && data.length > 0) {
      const loadedConversations = data.map((dbConversation: any) => ({
        id: dbConversation.id,
        title: dbConversation.title || 'New Conversation',
        messages: [], // Messages will be loaded separately
        createdAt: new Date(dbConversation.created_at),
        updatedAt: new Date(dbConversation.updated_at),
        contextSummary: dbConversation.context_summary || '',
      }));
      
      set((state: ChatStore) => {
        // Keep conversations already loaded but add any new ones
        const existingIds = state.conversations.map(c => c.id);
        const newConversations = loadedConversations.filter(c => !existingIds.includes(c.id));
        
        console.log(`Found ${newConversations.length} new conversations to add`);
        
        const updatedConversations = [...state.conversations, ...newConversations];
        
        return { 
          conversations: updatedConversations,
          currentConversationId: state.currentConversationId || (updatedConversations[0]?.id || null)
        };
      });
      
      console.log(`Successfully loaded ${data.length} conversations from database`);
    } else {
      console.log("No conversations found in database");
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
    
    // Check if we already have messages for this conversation
    const existingConversation = get().conversations.find(c => c.id === conversationId);
    if (existingConversation?.messages && existingConversation.messages.length > 0) {
      console.log(`Already have ${existingConversation.messages.length} messages for conversation ${conversationId}, skipping load`);
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
          console.log(`Found ${message.images.length} images for message ${message.id}`);
        }
        
        if (message.web_search_results) {
          formattedMessage.webSearchResults = message.web_search_results;
          console.log(`Found web search results for message ${message.id}`);
        }
        
        if (message.file_search_results) {
          formattedMessage.fileSearchResults = message.file_search_results;
          console.log(`Found file search results for message ${message.id}`);
        }
        
        return formattedMessage;
      });
      
      set((state: ChatStore) => ({
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
