
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
      const formattedConversations = conversations.map((conversation: any) => ({
        id: conversation.id,
        title: conversation.title || 'New Conversation',
        messages: [],
        createdAt: new Date(conversation.created_at),
        updatedAt: new Date(conversation.updated_at),
        contextSummary: conversation.context_summary || '',
      }));
      
      set({
        conversations: formattedConversations,
        currentConversationId: conversations[0].id,
      });
      
      // After setting the current conversation, load the messages for it
      console.log(`Set first conversation as current: ${conversations[0].id}, now loading its messages`);
      
      // We need to load messages for the first conversation
      // This needs to be called after the state update
      setTimeout(() => {
        const loadMessagesForConversation = (window as any).useChatStore?.getState()?.loadMessagesForConversation;
        if (typeof loadMessagesForConversation === 'function') {
          loadMessagesForConversation(conversations[0].id);
        }
      }, 0);
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
      console.log("No conversation ID provided, skipping message load");
      return;
    }
    
    console.log(`Loading messages for conversation ${conversationId}...`);
    
    // Fetch all messages for the conversation with all possible fields
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
          console.log(`Found ${message.images.length} images for message ${message.id}`);
        }
        
        // Add files if they exist
        if (message.files && message.files.length > 0) {
          formattedMessage.files = message.files;
          console.log(`Found ${message.files.length} files for message ${message.id}`);
        }
        
        // Add web search results if they exist
        if (message.web_search_results) {
          formattedMessage.webSearchResults = message.web_search_results;
          console.log(`Found web search results for message ${message.id}:`, 
            JSON.stringify(message.web_search_results).substring(0, 100) + '...');
        }
        
        // Add file search results if they exist
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
