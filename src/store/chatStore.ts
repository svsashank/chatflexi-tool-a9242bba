
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation, ChatState, AIModel } from '../types';
import { AI_MODELS, DEFAULT_MODEL } from '../constants';
import { sendMessageToLLM } from '../services/llmService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const useChatStore = create<ChatState & {
  createConversation: () => Promise<void>;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (content: string) => Promise<void>;
  selectModel: (model: AIModel) => void;
  generateResponse: () => Promise<void>;
  loadUserConversations: () => Promise<void>;
}>((set, get) => {
  // Create an initial conversation
  const initialConversation: Conversation = {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    contextSummary: '',
  };

  return {
    conversations: [initialConversation],
    currentConversationId: initialConversation.id,
    selectedModel: DEFAULT_MODEL,
    isLoading: false,

    createConversation: async () => {
      try {
        const newConversation: Conversation = {
          id: uuidv4(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          contextSummary: '',
        };

        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Store in database
          const { error } = await supabase
            .from('conversations')
            .insert({
              id: newConversation.id,
              user_id: session.user.id,
              title: newConversation.title,
              created_at: newConversation.createdAt.toISOString(),
              updated_at: newConversation.updatedAt.toISOString()
            });
            
          if (error) {
            console.error('Error creating conversation:', error);
            toast({
              title: 'Error',
              description: 'Could not create a new conversation',
              variant: 'destructive',
            });
          }
        }

        set((state) => ({
          conversations: [...state.conversations, newConversation],
          currentConversationId: newConversation.id,
        }));
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: 'Error',
          description: 'Could not create a new conversation',
          variant: 'destructive',
        });
      }
    },

    setCurrentConversation: (id: string) => {
      set({ currentConversationId: id });
    },

    deleteConversation: async (id: string) => {
      const { conversations, currentConversationId } = get();
      
      // Don't delete if it's the only conversation
      if (conversations.length <= 1) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Delete from database
          const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);
            
          if (error) {
            console.error('Error deleting conversation:', error);
            toast({
              title: 'Error',
              description: 'Could not delete conversation',
              variant: 'destructive',
            });
            return;
          }
        }
        
        const updatedConversations = conversations.filter(conv => conv.id !== id);
        
        // If the deleted conversation was the current one, set a new current
        const newCurrentId = id === currentConversationId 
          ? updatedConversations[0].id 
          : currentConversationId;
        
        set({
          conversations: updatedConversations,
          currentConversationId: newCurrentId,
        });
      } catch (error) {
        console.error('Error deleting conversation:', error);
        toast({
          title: 'Error',
          description: 'Could not delete conversation',
          variant: 'destructive',
        });
      }
    },

    addMessage: async (content: string) => {
      const { conversations, currentConversationId, selectedModel } = get();
      
      if (!currentConversationId) return;

      const message: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        model: selectedModel,
        timestamp: new Date(),
      };

      // Find the current conversation
      const currentConversation = conversations.find(conv => conv.id === currentConversationId);
      if (!currentConversation) return;

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
            await supabase
              .from('conversations')
              .update({ title })
              .eq('id', currentConversationId)
              .eq('user_id', session.user.id);
          }
          
          // Store the message
          await supabase
            .from('conversation_messages')
            .insert({
              id: message.id,
              conversation_id: currentConversationId,
              content: message.content,
              role: message.role,
              model_id: message.model.id,
              model_provider: message.model.provider
            });
        }
      } catch (error) {
        console.error('Error saving message:', error);
        // Continue with the conversation even if db save fails
      }

      // Automatically generate a response after adding a user message
      setTimeout(() => {
        get().generateResponse();
      }, 100);
    },

    selectModel: (model: AIModel) => {
      set({ selectedModel: model });
    },

    generateResponse: async () => {
      const { conversations, currentConversationId, selectedModel } = get();
      
      if (!currentConversationId) return;

      const currentConversation = conversations.find(
        (conv) => conv.id === currentConversationId
      );

      if (!currentConversation) return;
      
      try {
        // Get the last user message
        const lastUserMessage = [...currentConversation.messages]
          .reverse()
          .find(m => m.role === 'user');
        
        if (!lastUserMessage) return;
        
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
            await supabase
              .from('conversation_messages')
              .insert({
                id: assistantMessage.id,
                conversation_id: currentConversationId,
                content: assistantMessage.content,
                role: assistantMessage.role,
                model_id: assistantMessage.model.id,
                model_provider: assistantMessage.model.provider
              });
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
    },

    loadUserConversations: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No user session found');
          return;
        }
        
        // Fetch user's conversations
        const { data: conversations, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
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
          // No conversations found, create a new one
          await get().createConversation();
          return;
        }
        
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
              console.error('Error loading messages:', messagesError);
              return {
                id: conv.id,
                title: conv.title,
                messages: [],
                createdAt: new Date(conv.created_at),
                updatedAt: new Date(conv.updated_at),
                contextSummary: '',
              };
            }
            
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
        
        // Set loaded conversations in state
        set({
          conversations: loadedConversations,
          currentConversationId: loadedConversations[0].id,
        });
        
      } catch (error) {
        console.error('Error loading user conversations:', error);
        toast({
          title: 'Error',
          description: 'Could not load your conversation history',
          variant: 'destructive',
        });
      }
    },
  };
});

// Helper function to update context summary
const updateContextSummary = (currentSummary: string, message: Message): string => {
  // For simplicity, we'll just keep a running list of the last few interactions
  // In a more advanced system, you could use an LLM to generate a proper summary
  const role = message.role === 'user' ? 'User' : 'Krix';
  const newEntry = `${role}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`;
  
  // Split by lines, add new entry, and keep only the last 5 entries
  const summaryLines = currentSummary ? currentSummary.split('\n') : [];
  summaryLines.push(newEntry);
  
  return summaryLines.slice(-5).join('\n');
};

export default useChatStore;
