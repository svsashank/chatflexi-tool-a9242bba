
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { sendMessageToLLM } from "@/services/llmService";
import { Message, AIModel } from '@/types';
import { ChatStore } from '../types';

// Helper function to generate a conversation title from the initial message
const generateTitleFromMessage = (message: string): string => {
  // Trim the message to ensure we don't have leading/trailing whitespace
  const trimmedMessage = message.trim();
  
  // If the message is short enough, use it directly
  if (trimmedMessage.length <= 30) {
    return trimmedMessage;
  }
  
  // Otherwise, take the first 27 characters and add ellipsis
  return `${trimmedMessage.substring(0, 27)}...`;
};

export const createSendMessageAction = (set: Function, get: () => ChatStore) => async (
  content: string,
  images: string[] = [],
  files: string[] = []
) => {
  try {
    // Check if the message is empty and contains no attachments
    if (content.trim() === '' && images.length === 0 && files.length === 0) {
      toast({
        title: "Empty Message",
        description: "Please enter a message or add an attachment",
        variant: "destructive",
      });
      return;
    }

    const { selectedModel, conversations, currentConversationId } = get();
    let activeConversationId = currentConversationId;
    
    // Create a new conversation if there isn't one already
    if (!activeConversationId) {
      // Create new conversation first
      await get().createConversation();
      activeConversationId = get().currentConversationId;
      
      if (!activeConversationId) {
        throw new Error("Failed to create a new conversation");
      }
    }
    
    // Find the current conversation
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) {
      throw new Error(`Conversation with ID ${activeConversationId} not found`);
    }
    
    // New message object for the user's message
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      model: selectedModel,
      timestamp: new Date()
    };
    
    // Add images or files if they exist
    if (images && images.length > 0) {
      userMessage.images = images;
    }
    
    if (files && files.length > 0) {
      userMessage.files = files;
    }
    
    // Add message to state
    set((state: ChatStore) => ({
      conversations: state.conversations.map(conv =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updatedAt: new Date()
            }
          : conv
      ),
      isLoading: true
    }));
    
    // Check if this is the first message in the conversation and update the title if needed
    const isFirstMessage = currentConversation.messages.length === 0;
    
    if (isFirstMessage && currentConversation.title === 'New Conversation') {
      const newTitle = generateTitleFromMessage(content);
      
      // Update conversation title in state
      set((state: ChatStore) => ({
        conversations: state.conversations.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, title: newTitle }
            : conv
        ),
      }));
      
      // Update title in database
      get().updateConversationTitle(activeConversationId, newTitle);
    }
    
    // Save message to database
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("User not authenticated, skipping database save");
      // Still try to generate a response despite not saving to database
      await get().generateResponse();
      return;
    }
    
    // Check if conversation exists in database
    const { data: existingConv, error: convCheckError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', activeConversationId)
      .maybeSingle();
      
    if (convCheckError) {
      console.error('Error checking conversation:', convCheckError);
      toast({
        title: 'Error',
        description: 'Failed to verify conversation in database',
        variant: 'destructive',
      });
      // Continue with generating response regardless
    }
    
    // Create conversation if it doesn't exist
    if (!existingConv) {
      const { error: createConvError } = await supabase
        .from('conversations')
        .insert([{
          id: activeConversationId,
          user_id: session.user.id,
          title: currentConversation.title || 'New Conversation',
          created_at: currentConversation.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (createConvError) {
        console.error('Error creating conversation in database:', createConvError);
        toast({
          title: 'Error',
          description: 'Could not create conversation in database',
          variant: 'destructive',
        });
        // Continue with generating response regardless
      } else {
        console.log('Successfully created conversation in database:', activeConversationId);
      }
    }

    // Now insert the message
    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        id: userMessage.id,
        conversation_id: activeConversationId,
        content: userMessage.content,
        role: userMessage.role,
        model_id: userMessage.model.id,
        model_provider: userMessage.model.provider,
        images: userMessage.images || [],
        created_at: userMessage.timestamp.toISOString()
      });
      
    if (error) {
      console.error('Error saving message to database:', error);
      console.log('Message data that failed to save:', {
        userId: session.user.id,
        conversationId: activeConversationId,
        messageId: userMessage.id,
        error: error
      });
      toast({
        title: 'Error',
        description: 'Could not save message to database',
        variant: 'destructive',
      });
      // Continue with generating response regardless
    } else {
      console.log('Successfully saved user message to database');
    }

    // Generate AI response
    await get().generateResponse();

  } catch (error) {
    console.error('Error in sendMessage:', error);
    set({ isLoading: false });
    get().handleError('Failed to send message');
  }
};
