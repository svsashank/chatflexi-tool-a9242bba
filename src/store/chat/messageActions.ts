import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatState, MessageSlice } from './types';
import { generateAIResponse } from '@/services/llmService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { updateContextSummary } from './utils';

export const selectModelAction = (set: Function) => (model: any) => {
  set({ selectedModel: model });
};

export const generateResponseAction = (set: Function, get: Function) => async () => {
  set({ isLoading: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const currentConversation = get().conversations.find(c => c.id === currentConversationId);
    const selectedModel = get().selectedModel;

    if (!currentConversationId || !currentConversation) {
      toast({
        title: 'Error',
        description: 'No active conversation found',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }

    const userMessages = currentConversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const aiResponse = await generateAIResponse(userMessages, selectedModel, currentConversation.contextSummary);

    if (aiResponse && aiResponse.content) {
      const newMessage = {
        id: uuidv4(),
        content: aiResponse.content,
        role: 'assistant' as const,
        model: selectedModel,
        timestamp: new Date(),
      };

      // Update context summary
      const updatedContextSummary = updateContextSummary(currentConversation.contextSummary, newMessage);

      // Optimistically update the state
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
        ),
        isLoading: false,
      }));

      // Persist the new message to the database
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { error } = await supabase
            .from('conversation_messages')
            .insert([
              {
                id: newMessage.id,
                conversation_id: currentConversationId,
                content: newMessage.content,
                role: newMessage.role,
                model_id: selectedModel.id,
                model_provider: selectedModel.provider,
                created_at: newMessage.timestamp.toISOString(),
              },
            ]);

          if (error) {
            console.error('Error saving message to database:', error);
            toast({
              title: 'Error',
              description: 'Failed to save message to database',
              variant: 'destructive',
            });
          } else {
            // Update the conversation's updated_at timestamp
            const { error: conversationError } = await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString(), context_summary: updatedContextSummary })
              .eq('id', currentConversationId);

            if (conversationError) {
              console.error('Error updating conversation timestamp:', conversationError);
            }
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
      toast({
        title: 'Error',
        description: 'Failed to generate response',
        variant: 'destructive',
      });
      set({ isLoading: false });
    }
  } catch (error) {
    console.error('Error generating response:', error);
    set({ isLoading: false });
  }
  
  return get().regenerateMessage();
};

// Updated to match the expected StateCreator pattern without the third parameter
export const createMessageSlice: StateCreator<
  ChatState, 
  [], 
  [], 
  MessageSlice
> = (set, get) => ({
  sendMessage: async (content) => {
    // Add user message to state
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
    const newMessage = {
      id: uuidv4(),
      content,
      role: 'user' as const,
      model: selectedModel,
      timestamp: new Date(),
    };
    
    // Update context summary
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
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await supabase
          .from('conversation_messages')
          .insert([
            {
              id: newMessage.id,
              conversation_id: currentConversationId,
              content: newMessage.content,
              role: newMessage.role,
              model_id: selectedModel.id,
              model_provider: selectedModel.provider,
              created_at: newMessage.timestamp.toISOString(),
            },
          ]);
        
        if (error) {
          console.error('Error saving message to database:', error);
          toast({
            title: 'Error',
            description: 'Failed to save message to database',
            variant: 'destructive',
          });
        } else {
          // Update the conversation's updated_at timestamp
          const { error: conversationError } = await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString(), context_summary: updatedContextSummary })
            .eq('id', currentConversationId);
          
          if (conversationError) {
            console.error('Error updating conversation timestamp:', conversationError);
          }
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
  },
  
  regenerateMessage: async () => {
    const currentConversationId = get().currentConversationId;
    
    if (!currentConversationId) {
      toast({
        title: 'Error',
        description: 'No active conversation found',
        variant: 'destructive',
      });
      return Promise.resolve();
    }
    
    set(state => {
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === currentConversationId) {
          // Filter out the last message (assuming it's the AI's last response)
          const updatedMessages = conv.messages.slice(0, -1);
          return { ...conv, messages: updatedMessages };
        }
        return conv;
      });
      
      return { conversations: updatedConversations };
    });
    
    return Promise.resolve();
  }
});

export const addMessageAction = (set: Function, get: Function) => async (content: string) => {
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
  };

  set(state => ({
    conversations: state.conversations.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: [...conv.messages, newMessage] }
        : conv
    )
  }));

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { error } = await supabase
        .from('conversation_messages')
        .insert([
          {
            id: newMessage.id,
            conversation_id: currentConversationId,
            content: newMessage.content,
            role: newMessage.role,
            model_id: selectedModel.id,
            model_provider: selectedModel.provider,
            created_at: newMessage.timestamp.toISOString(),
          },
        ]);

      if (error) {
        console.error('Error saving message to database:', error);
        toast({
          title: 'Error',
          description: 'Failed to save message to database',
          variant: 'destructive',
        });
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
};
