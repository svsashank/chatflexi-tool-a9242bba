
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { updateContextSummary } from '../utils';

export const addMessageAction = (set: Function, get: Function) => async (content: string, images: string[] = [], files: string[] = []) => {
  const currentConversationId = get().currentConversationId;
  const selectedModel = get().selectedModel;

  if (!currentConversationId) {
    toast({
      title: 'Error',
      description: 'No active conversation found',
      variant: 'destructive',
    });
    return;
  }

  const newMessage = {
    id: uuidv4(),
    content,
    role: 'user' as const,
    model: selectedModel,
    timestamp: new Date(),
    images,
    files,
  };

  // Update local state immediately
  set(state => ({
    conversations: state.conversations.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: [...conv.messages, newMessage] }
        : conv
    )
  }));

  // Check for authentication before saving to database
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    console.warn("User not authenticated, skipping database save");
    return;
  }
  
  try {
    console.log("Saving user message to database for conversation:", currentConversationId);
    
    // First, check if conversation exists
    const { data: existingConv, error: convCheckError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', currentConversationId)
      .maybeSingle();
      
    if (convCheckError) {
      console.error('Error checking conversation:', convCheckError);
      return;
    }
    
    if (!existingConv) {
      // Create the conversation first if it doesn't exist
      const { error: createConvError } = await supabase
        .from('conversations')
        .insert([{
          id: currentConversationId,
          user_id: session.user.id,
          title: 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (createConvError) {
        console.error('Error creating conversation:', createConvError);
        toast({
          title: 'Error',
          description: 'Failed to create conversation in database',
          variant: 'destructive',
        });
        return;
      }
      console.log('Created new conversation in database:', currentConversationId);
    }
    
    // Prepare message data for the database
    const messageData = {
      id: newMessage.id,
      conversation_id: currentConversationId,
      content: newMessage.content,
      role: newMessage.role,
      model_id: selectedModel.id,
      model_provider: selectedModel.provider,
      created_at: newMessage.timestamp.toISOString(),
    };

    // Add images if present
    if (images && images.length > 0) {
      Object.assign(messageData, { images });
    }

    // Add files if present
    if (files && files.length > 0) {
      Object.assign(messageData, { files });
    }

    const { error } = await supabase
      .from('conversation_messages')
      .insert([messageData]);

    if (error) {
      console.error('Error saving message to database:', error);
      console.log('Message data that failed to save:', {
        userId: session.user.id,
        conversationId: currentConversationId,
        messageId: newMessage.id,
        error: error
      });
      toast({
        title: 'Error',
        description: 'Failed to save message to database',
        variant: 'destructive',
      });
    } else {
      console.log('Successfully saved user message to database');
    }
  } catch (dbError) {
    console.error('Database error:', dbError);
    toast({
      title: 'Error',
      description: 'Failed to save message to database',
      variant: 'destructive',
    });
  }
};
