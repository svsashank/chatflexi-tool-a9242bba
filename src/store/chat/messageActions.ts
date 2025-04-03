
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';
import { ChatStore } from './types';
import { updateContextSummary } from './utils';
import { sendMessageToLLM } from '@/services/llmService';

export const addMessageAction = (set: Function, get: () => ChatStore) => async (content: string) => {
  const { conversations, currentConversationId, selectedModel } = get();
  
  if (!currentConversationId) {
    console.error("No current conversation ID set");
    return;
  }

  const message: Message = {
    id: uuidv4(),
    content,
    role: 'user',
    model: selectedModel,
    timestamp: new Date(),
  };

  // Find the current conversation
  const currentConversation = conversations.find(conv => conv.id === currentConversationId);
  if (!currentConversation) {
    console.error("Current conversation not found in state:", currentConversationId);
    console.log("Available conversations:", conversations.map(c => c.id));
    return;
  }

  // Update conversation title if it's the first message
  const title = currentConversation.messages.length === 0 
    ? content.slice(0, 30) + (content.length > 30 ? '...' : '') 
    : currentConversation.title;
  
  // Update context summary with the new message
  const updatedContextSummary = updateContextSummary(currentConversation.contextSummary, message);
  
  // Update the conversations in state
  const updatedConversations = conversations.map((conv) => {
    if (conv.id === currentConversationId) {
      return {
        ...conv,
        title,
        messages: [...conv.messages, message],
        updatedAt: new Date(),
        contextSummary: updatedContextSummary,
      };
    }
    return conv;
  });

  set({
    conversations: updatedConversations,
    isLoading: true,
  });

  try {
    // Store message in the database if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Update conversation title if needed
      if (currentConversation.messages.length === 0) {
        const { error: titleError } = await supabase
          .from('conversations')
          .update({ 
            title,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConversationId)
          .eq('user_id', session.user.id);
          
        if (titleError) {
          console.error('Error updating conversation title:', titleError);
        } else {
          console.log("Successfully updated conversation title in database");
        }
      } else {
        // Just update the timestamp
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversationId)
          .eq('user_id', session.user.id);
          
        if (updateError) {
          console.error('Error updating conversation timestamp:', updateError);
        }
      }
      
      // Store the message
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          id: message.id,
          conversation_id: currentConversationId,
          content: message.content,
          role: message.role,
          model_id: message.model.id,
          model_provider: message.model.provider
        });
        
      if (messageError) {
        console.error('Error saving user message to database:', messageError);
      } else {
        console.log("Successfully saved user message to database");
      }
    }
  } catch (error) {
    console.error('Error saving message:', error);
    // Continue with the conversation even if db save fails
  }

  // Automatically generate a response after adding a user message
  setTimeout(() => {
    get().generateResponse();
  }, 100);
};

export const selectModelAction = (set: Function) => (model: any) => {
  set({ selectedModel: model });
};

export const generateResponseAction = (set: Function, get: () => ChatStore) => async () => {
  const { conversations, currentConversationId, selectedModel } = get();
  
  if (!currentConversationId) {
    console.error("No current conversation ID set for response generation");
    return;
  }

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  if (!currentConversation) {
    console.error("Current conversation not found for response generation:", currentConversationId);
    return;
  }
  
  try {
    // Get the last user message
    const lastUserMessage = [...currentConversation.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      console.error("No user message found to respond to");
      return;
    }
    
    // Get response from the selected LLM
    const responseText = await sendMessageToLLM(
      lastUserMessage.content, 
      selectedModel,
      currentConversation.messages
    );

    const assistantMessage: Message = {
      id: uuidv4(),
      content: responseText,
      role: 'assistant',
      model: selectedModel,
      timestamp: new Date(),
    };

    // Update conversation context summary
    const updatedContextSummary = updateContextSummary(
      currentConversation.contextSummary, 
      assistantMessage
    );

    const updatedConversations = conversations.map((conv) => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, assistantMessage],
          updatedAt: new Date(),
          contextSummary: updatedContextSummary,
        };
      }
      return conv;
    });

    set({
      conversations: updatedConversations,
      isLoading: false,
    });

    // Store the assistant message in database if user is logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Update conversation's updated_at timestamp
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversationId)
          .eq('user_id', session.user.id);
          
        if (updateError) {
          console.error('Error updating conversation timestamp:', updateError);
        }
          
        // Store assistant message
        const { error: messageError } = await supabase
          .from('conversation_messages')
          .insert({
            id: assistantMessage.id,
            conversation_id: currentConversationId,
            content: assistantMessage.content,
            role: assistantMessage.role,
            model_id: assistantMessage.model.id,
            model_provider: assistantMessage.model.provider
          });
          
        if (messageError) {
          console.error('Error saving assistant message to database:', messageError);
        } else {
          console.log("Successfully saved assistant message to database");
        }
      }
    } catch (error) {
      console.error('Error saving assistant message:', error);
      // Continue even if db save fails
    }
  } catch (error) {
    console.error("Error generating response:", error);
    
    // Add error message to the conversation
    const errorMessage: Message = {
      id: uuidv4(),
      content: `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`,
      role: 'assistant',
      model: selectedModel,
      timestamp: new Date(),
    };
    
    const updatedConversations = conversations.map((conv) => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, errorMessage],
          updatedAt: new Date(),
        };
      }
      return conv;
    });
    
    set({
      conversations: updatedConversations,
      isLoading: false,
    });
  }
};
