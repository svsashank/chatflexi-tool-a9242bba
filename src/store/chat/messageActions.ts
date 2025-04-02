import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatState } from './types';
import { sendMessageToLLM } from '@/services/llmService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface MessageSlice {
  sendMessage: (content: string) => Promise<void>;
  regenerateMessage: () => Promise<void>;
}

export const createMessageSlice: StateCreator<ChatState, [], [], MessageSlice> = (set, get) => ({
  sendMessage: async (content) => {
    const currentConversationId = get().currentConversationId;
    const selectedModel = get().selectedModel;
    const user = get().user;

    if (!currentConversationId) {
      toast({
        title: "Error",
        description: "No conversation selected.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: "Error",
        description: "No model selected.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: content,
      model: selectedModel,
      createdAt: new Date().toISOString(),
    };
    
    try {
      // Add user message to state
      set(state => ({
        messages: [...state.messages, userMessage],
        isProcessing: true,
      }));

      // Save user message to database if authenticated
      if (user) {
        try {
          const { error } = await supabase
            .from('messages')
            .insert({
              id: userMessage.id,
              chat_id: currentConversationId,
              created_at: userMessage.createdAt,
              content: userMessage.content,
              role: userMessage.role,
              model_id: selectedModel.id,
              model_name: selectedModel.name,
            });

          if (error) {
            console.error("Error saving message:", error);
            toast({
              title: "Error",
              description: "Failed to save message to database.",
              variant: "destructive",
            });
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
          toast({
            title: "Error",
            description: "Failed to save message to database.",
            variant: "destructive",
          });
        }
      }

      // Generate AI response
      const model = get().selectedModel;
      const { content: responseContent, usage } = await sendMessageToLLM(
        content,
        model,
        [...get().messages, userMessage]
      );

      // Create AI message 
      const aiMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        model: model,
        createdAt: new Date().toISOString(),
        // Add usage information to the message metadata
        metadata: {
          usageDisplay: usage
        }
      };

      // Update state with AI response
      set(state => ({
        messages: [...state.messages, aiMessage],
        isProcessing: false,
      }));

      // Save AI message to database if authenticated
      if (user) {
        try {
          const { error } = await supabase
            .from('messages')
            .insert({
              id: aiMessage.id,
              chat_id: currentConversationId,
              content: aiMessage.content,
              created_at: aiMessage.createdAt,
              role: aiMessage.role,
              model_id: aiMessage.model.id,
              model_name: aiMessage.model.name,
            });

          if (error) {
            console.error("Error saving AI message:", error);
            toast({
              title: "Error",
              description: "Failed to save AI message to database.",
              variant: "destructive",
            });
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
          toast({
            title: "Error",
            description: "Failed to save AI message to database.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("LLM service error:", error);
      set({ isProcessing: false });
      toast({
        title: "Error",
        description: "Failed to get response from model.",
        variant: "destructive",
      });
    }
  },

  regenerateMessage: async () => {
    const messages = get().messages;
    const currentConversationId = get().currentConversationId;
    const selectedModel = get().selectedModel;
    const user = get().user;

    if (!currentConversationId) {
      toast({
        title: "Error",
        description: "No conversation selected.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: "Error",
        description: "No model selected.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated.",
        variant: "destructive",
      });
      return;
    }

    // Find the last AI message
    const lastAiMessageIndex = messages.findLastIndex(msg => msg.role === 'assistant');

    if (lastAiMessageIndex === -1) {
      toast({
        title: "Error",
        description: "No AI message found to regenerate.",
        variant: "destructive",
      });
      return;
    }

    // Get the last user message
    const lastUserMessage = messages[lastAiMessageIndex - 1];

    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      toast({
        title: "Error",
        description: "No corresponding user message found.",
        variant: "destructive",
      });
      return;
    }

    // Remove the last AI message and the last user message
    const updatedMessages = messages.slice(0, lastAiMessageIndex - 1);

    set({
      messages: updatedMessages,
      isProcessing: true,
    });

    try {
      // Generate AI response
      const model = get().selectedModel;
      const { content: responseContent, usage } = await sendMessageToLLM(
        lastUserMessage.content,
        model,
        [...updatedMessages, lastUserMessage]
      );

      // Create AI message
      const aiMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        model: model,
        createdAt: new Date().toISOString(),
        metadata: {
          usageDisplay: usage
        }
      };

      // Update state with AI response
      set(state => ({
        messages: [...state.messages, aiMessage],
        isProcessing: false,
      }));

      // Save AI message to database if authenticated
      if (user) {
        try {
          const { error } = await supabase
            .from('messages')
            .insert({
              id: aiMessage.id,
              chat_id: currentConversationId,
              content: aiMessage.content,
              created_at: aiMessage.createdAt,
              role: aiMessage.role,
              model_id: aiMessage.model.id,
              model_name: aiMessage.model.name,
            });

          if (error) {
            console.error("Error saving AI message:", error);
            toast({
              title: "Error",
              description: "Failed to save AI message to database.",
              variant: "destructive",
            });
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
          toast({
            title: "Error",
            description: "Failed to save AI message to database.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("LLM service error:", error);
      set({ isProcessing: false });
      toast({
        title: "Error",
        description: "Failed to get response from model.",
        variant: "destructive",
      });
    }
  }
});
