
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { updateContextSummary } from '../utils';
import { Message } from '@/types';

export const addMessageAction = (set: Function, get: Function) => (message: Message) => {
  const currentConversationId = get().currentConversationId;

  if (!currentConversationId) {
    toast({
      title: 'Error',
      description: 'No active conversation found',
      variant: 'destructive',
    });
    return;
  }

  set(state => ({
    conversations: state.conversations.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: [...conv.messages, message] }
        : conv
    )
  }));

  // Check for authentication before saving to database
  saveMessageToDatabase(currentConversationId, message);
};

// Helper function to save message to database
async function saveMessageToDatabase(conversationId: string, message: Message) {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      console.log("Saving user message to database for conversation:", conversationId);
      
      // Prepare message data for the database
      const messageData = {
        id: message.id,
        conversation_id: conversationId,
        content: message.content,
        role: message.role,
        model_id: message.model.id,
        model_provider: message.model.provider,
        created_at: message.timestamp.toISOString(),
      };

      // Add images if present
      if (message.images && message.images.length > 0) {
        Object.assign(messageData, { images: message.images });
      }

      // Add files if present
      if (message.files && message.files.length > 0) {
        Object.assign(messageData, { files: message.files });
      }

      const { error } = await supabase
        .from('conversation_messages')
        .insert([messageData]);

      if (error) {
        console.error('Error saving message to database:', error);
        toast({
          title: 'Error',
          description: 'Failed to save message to database',
          variant: 'destructive',
        });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      toast({
        title: 'Error',
        description: 'Failed to save message to database',
        variant: 'destructive',
      });
    }
  } else {
    console.warn("User not authenticated, skipping database save");
  }
}
