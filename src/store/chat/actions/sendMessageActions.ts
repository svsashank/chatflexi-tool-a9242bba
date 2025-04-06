
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { updateContextSummary } from '../utils';

export const createSendMessageAction = (set: Function, get: Function) => 
  async (content: string, images: string[] = []) => {
    const currentConversationId = get().currentConversationId;
    
    if (!currentConversationId) {
      toast({
        title: 'Error',
        description: 'No active conversation found',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedModel = get().selectedModel;
    
    // Validate if model supports images when images are provided
    if (images.length > 0 && !selectedModel.capabilities.includes('images')) {
      toast({
        title: 'Error',
        description: `${selectedModel.name} doesn't support image analysis. Please select a model with vision capabilities.`,
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
      images: images.length > 0 ? images : undefined,
    };
    
    let currentConversation = get().conversations.find(c => c.id === currentConversationId);
    let updatedContextSummary = currentConversation ? updateContextSummary(currentConversation.contextSummary, newMessage) : '';
    
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [...conv.messages, newMessage],
            updatedAt: new Date(),
            contextSummary: updatedContextSummary,
          }
          : conv
      )
    }));
    
    // Check for authentication before saving to database
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      try {
        console.log("Saving user message to database for conversation:", currentConversationId);
        
        // First, check if the conversation exists and has the correct user_id
        const { data: convData, error: convCheckError } = await supabase
          .from('conversations')
          .select('id, user_id')
          .eq('id', currentConversationId)
          .maybeSingle();
          
        if (convCheckError) {
          console.error('Error checking conversation:', convCheckError);
          toast({
            title: 'Error',
            description: 'Failed to verify conversation ownership',
            variant: 'destructive',
          });
          return;
        }
        
        if (!convData) {
          console.log('Conversation not found in database, creating it now...');
          // Create the conversation if it doesn't exist
          const { error: createConvError } = await supabase
            .from('conversations')
            .insert([{
              id: currentConversationId,
              user_id: session.user.id,
              title: currentConversation?.title || 'New Conversation',
              created_at: currentConversation?.createdAt.toISOString() || new Date().toISOString(),
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
          console.log('Successfully created conversation in database');
        } else if (convData.user_id !== session.user.id) {
          console.error('Conversation belongs to a different user');
          toast({
            title: 'Error',
            description: 'You do not have permission to access this conversation',
            variant: 'destructive',
          });
          return;
        }
        
        // Store message content and metadata in the database
        const messageData: any = {
          id: newMessage.id,
          conversation_id: currentConversationId,
          content: newMessage.content,
          role: newMessage.role,
          model_id: selectedModel.id,
          model_provider: selectedModel.provider,
          created_at: newMessage.timestamp.toISOString(),
        };
        
        // Add images if they exist
        if (images && images.length > 0) {
          messageData.images = images;
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
        } else {
          // Update the conversation timestamp
          const { error: conversationError } = await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);
          
          if (conversationError) {
            console.error('Error updating conversation timestamp:', conversationError);
          }
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
    
    // After adding the user message, generate an AI response
    const generateResponse = get().generateResponse;
    if (generateResponse) {
      await generateResponse();
    } else {
      console.error('generateResponse function is not available in the store');
      toast({
        title: 'Error',
        description: 'Failed to generate AI response',
        variant: 'destructive',
      });
    }
  };
