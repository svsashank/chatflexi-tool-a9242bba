import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Conversation } from '@/types';
import { ChatStore } from '../types';

// Track if a creation is in progress
let isCreatingConversation = false;

export const createConversationAction = (set: Function, get: () => ChatStore) => async () => {
  // Prevent multiple simultaneous conversation creations
  if (isCreatingConversation) {
    console.log("Conversation creation already in progress, skipping");
    return;
  }
  
  try {
    isCreatingConversation = true;
    
    // First check if we already have conversations
    if (get().conversations.length > 0 && get().currentConversationId) {
      console.log("Already have conversations, no need to create a new one");
      isCreatingConversation = false;
      return;
    }
    
    const newConversation: Conversation = {
      id: uuidv4(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      contextSummary: '',
    };

    console.log("Creating new conversation with ID:", newConversation.id);

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
        console.error('Error creating conversation in database:', error);
        toast({
          title: 'Error',
          description: 'Could not create a new conversation',
          variant: 'destructive',
        });
      } else {
        console.log("Successfully saved new conversation to database");
      }
    }

    set((state: ChatStore) => ({
      conversations: [...state.conversations, newConversation],
      currentConversationId: newConversation.id,
    }));

    console.log("New conversation created and set as current with ID:", newConversation.id);
  } catch (error) {
    console.error('Error creating conversation:', error);
    toast({
      title: 'Error',
      description: 'Could not create a new conversation',
      variant: 'destructive',
    });
  } finally {
    isCreatingConversation = false;
  }
};

export const setCurrentConversationIdAction = (set: Function, get: () => ChatStore) => async (id: string) => {
  console.log("Setting current conversation to:", id);
  
  // Verify the conversation exists in our state before setting it
  const conversation = get().conversations.find(conv => conv.id === id);
  if (!conversation) {
    console.error(`Conversation with id ${id} not found in state`);
    console.log("Available conversations:", get().conversations.map(c => c.id));
    return;
  }
  
  // Set the conversation as current
  set({ currentConversationId: id });
  
  // Load messages when switching conversations to ensure we have the latest data
  console.log(`Loading messages for conversation ${id}`);
  await get().loadMessagesForConversation(id);
};

export const deleteConversationAction = (set: Function, get: () => ChatStore) => async (id: string) => {
  const { conversations, currentConversationId } = get();
  
  // Don't delete if it's the only conversation
  if (conversations.length <= 1) {
    console.log("Can't delete the only conversation");
    return;
  }
  
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
        console.error('Error deleting conversation from database:', error);
        toast({
          title: 'Error',
          description: 'Could not delete conversation',
          variant: 'destructive',
        });
        return;
      } else {
        console.log("Successfully deleted conversation from database");
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

    console.log("Conversation deleted. New current conversation:", newCurrentId);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    toast({
      title: 'Error',
      description: 'Could not delete conversation',
      variant: 'destructive',
    });
  }
};

export const updateConversationTitleAction = (set: Function, get: () => ChatStore) => async (id: string, title: string) => {
  try {
    // Update in state
    set((state: ChatStore) => ({
      conversations: state.conversations.map(conv =>
        conv.id === id ? { ...conv, title: title } : conv
      ),
    }));

    // Update in database if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('conversations')
        .update({ title: title })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error updating conversation title in database:', error);
        toast({
          title: 'Error',
          description: 'Could not update conversation title in database',
          variant: 'destructive',
        });
      }
    }
  } catch (error) {
    console.error('Error updating conversation title:', error);
    toast({
      title: 'Error',
      description: 'Could not update conversation title',
      variant: 'destructive',
    });
  }
};

export const resetConversationsAction = (set: Function) => () => {
  // Create a single empty conversation when resetting
  const newConversation: Conversation = {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    contextSummary: '',
  };
  
  set({
    conversations: [newConversation],
    currentConversationId: newConversation.id,
  });
  
  console.log("Reset conversations state with a new conversation:", newConversation.id);
};
