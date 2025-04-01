
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AI_MODELS, DEFAULT_MODEL } from '@/constants';
import { Conversation, Message } from '@/types';
import { ChatStore } from './types';
import { updateContextSummary } from './utils';

export const loadUserConversationsAction = (set: Function) => async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('No user session found');
      return;
    }
    
    console.log("Loading conversations for user:", session.user.id);
    
    // Fetch user's conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    
    if (conversationsError) {
      console.error('Error loading conversations:', conversationsError);
      toast({
        title: 'Error',
        description: 'Could not load your conversations',
        variant: 'destructive',
      });
      return;
    }
    
    if (!conversations || conversations.length === 0) {
      console.log("No conversations found in database");
      return;
    }
    
    console.log(`Found ${conversations.length} conversations in database`);
    
    // Load all conversations with their messages
    const loadedConversations: Conversation[] = await Promise.all(
      conversations.map(async (conv) => {
        // Fetch messages for this conversation
        const { data: messages, error: messagesError } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });
          
        if (messagesError) {
          console.error('Error loading messages for conversation', conv.id, messagesError);
          return {
            id: conv.id,
            title: conv.title,
            messages: [],
            createdAt: new Date(conv.created_at),
            updatedAt: new Date(conv.updated_at),
            contextSummary: '',
          };
        }
        
        console.log(`Loaded ${messages?.length || 0} messages for conversation ${conv.id}`);
        
        // Convert database messages to app Message type
        const formattedMessages: Message[] = messages?.map(msg => {
          // Find the model based on model_id and provider
          const model = AI_MODELS.find(
            m => m.id === msg.model_id && m.provider.toLowerCase() === msg.model_provider?.toLowerCase()
          ) || DEFAULT_MODEL;
          
          return {
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            model,
            timestamp: new Date(msg.created_at),
          };
        }) || [];
        
        // Generate context summary from messages
        let contextSummary = '';
        formattedMessages.forEach(msg => {
          contextSummary = updateContextSummary(contextSummary, msg);
        });
        
        return {
          id: conv.id,
          title: conv.title,
          messages: formattedMessages,
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          contextSummary,
        };
      })
    );
    
    console.log("Loaded conversations:", loadedConversations.length);
    
    // Set loaded conversations in state
    if (loadedConversations.length > 0) {
      set({
        conversations: loadedConversations,
        currentConversationId: loadedConversations[0].id,
      });
      console.log("Set first conversation as current:", loadedConversations[0].id);
    }
    
  } catch (error) {
    console.error('Error loading user conversations:', error);
    toast({
      title: 'Error',
      description: 'Could not load your conversation history',
      variant: 'destructive',
    });
  }
};
