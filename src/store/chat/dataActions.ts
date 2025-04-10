
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Message, AIModel, Conversation } from "@/types";

export const loadUserConversationsAction = (set: Function) => async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log("User not authenticated, skipping conversation load");
      return;
    }
    
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
      return;
    }
    
    console.log(`Loaded conversations: ${conversations.length}`);
    
    if (conversations.length > 0) {
      set({
        conversations: conversations.map((conversation: any) => ({
          id: conversation.id,
          title: conversation.title || 'New Conversation',
          messages: [],
          createdAt: new Date(conversation.created_at),
          updatedAt: new Date(conversation.updated_at),
          contextSummary: conversation.context_summary || '',
        })),
        currentConversationId: conversations[0].id,
      });
      
      // Set first conversation as current
      console.log(`Set first conversation as current: ${conversations[0].id}`);
    }
  } catch (error) {
    console.error("Error in loadUserConversations:", error);
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
      return;
    }
    
    // Fetch the actual messages directly without checking columns first
    // This avoids the 400 error when querying for specific columns that might not exist
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
        
        // Add images if they exist
        if (message.images && message.images.length > 0) {
          formattedMessage.images = message.images;
        }
        
        // Add files if they exist
        if (message.files && message.files.length > 0) {
          formattedMessage.files = message.files;
        }
        
        // Add search results if they exist
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
