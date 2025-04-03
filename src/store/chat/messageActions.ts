
import { v4 as uuidv4 } from 'uuid';
import { ChatState } from './types';
import { sendMessageToLLM } from '@/services/llmService';
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

    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      toast({
        title: 'Error',
        description: 'Please send a message first',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }

    const aiResponse = await sendMessageToLLM(
      lastMessage.content,
      selectedModel,
      currentConversation.messages
    );

    if (aiResponse) {
      const newMessage = {
        id: uuidv4(),
        content: aiResponse,
        role: 'assistant' as const,
        model: selectedModel,
        timestamp: new Date(),
      };

      const updatedContextSummary = updateContextSummary(currentConversation.contextSummary, newMessage);

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
            // Update the conversation timestamp without context_summary field
            const { error: conversationError } = await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
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
};

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

export const createSendMessageAction = (set: Function, get: Function) => 
  async (content: string) => {
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
          // Update the conversation timestamp without context_summary field
          const { error: conversationError } = await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
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

export const createRegenerateMessageAction = (set: Function, get: Function) => 
  async () => {
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
          const updatedMessages = conv.messages.slice(0, -1);
          return { ...conv, messages: updatedMessages };
        }
        return conv;
      });
      
      return { conversations: updatedConversations };
    });
    
    // After removing the last AI message, generate a new response
    const generateResponse = get().generateResponse;
    if (generateResponse) {
      await generateResponse();
    } else {
      console.error('generateResponse function is not available in the store');
    }
    
    return Promise.resolve();
  };
