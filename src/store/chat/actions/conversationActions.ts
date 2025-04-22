
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Conversation } from '@/types';
import { ChatStore } from '../types';

// Keep track of loading states to prevent duplicate requests
const loadingStates = {
  creating: false,
  deleting: new Set<string>(),
  updating: new Set<string>(),
  abortController: null as AbortController | null,
};

// New function to generate a meaningful title based on user message
export const generateConversationTitleFromMessage = (message: string) => {
  // Remove special characters and normalize spaces
  const cleanMessage = message.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  
  // Limit to first 5-8 words for a reasonable title length
  const words = cleanMessage.split(' ');
  const titleWords = words.slice(0, Math.min(8, Math.max(5, words.length)));
  let title = titleWords.join(' ');
  
  // Add ellipsis if truncated and capitalize first letter
  if (words.length > titleWords.length) {
    title += '...';
  }
  
  // Ensure title isn't too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  // If still empty after processing, use default title
  if (!title || title.length < 3) {
    title = 'New Conversation';
  }
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
};

export const createConversationAction = (set: Function, get: () => ChatStore) => async () => {
  try {
    // Cancel any existing request
    if (loadingStates.abortController) {
      loadingStates.abortController.abort();
    }
    loadingStates.abortController = new AbortController();

    // Prevent multiple simultaneous creation requests
    if (loadingStates.creating) {
      console.log("Already creating a conversation, please wait");
      return null;
    }
    
    loadingStates.creating = true;
    console.log("Creating new conversation...");
    
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
    
    if (!session?.user) {
      console.error('No authenticated user found');
      toast.error('Authentication required to create conversations');
      loadingStates.creating = false;
      loadingStates.abortController = null;
      return null;
    }
    
    // Check if request was aborted during authentication check
    if (loadingStates.abortController?.signal.aborted) {
      console.log('Conversation creation aborted after auth check');
      loadingStates.creating = false;
      loadingStates.abortController = null;
      return null;
    }
    
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
      toast.error('Could not create a new conversation');
      loadingStates.creating = false;
      loadingStates.abortController = null;
      return null;
    }
    
    // Check if request was aborted during database operation
    if (loadingStates.abortController?.signal.aborted) {
      console.log('Conversation creation aborted after database operation');
      loadingStates.creating = false;
      loadingStates.abortController = null;
      return null;
    }
    
    console.log("Successfully saved new conversation to database");

    // Update local state
    set((state: ChatStore) => ({
      conversations: [newConversation, ...state.conversations],
      currentConversationId: newConversation.id,
    }));

    console.log("New conversation created and set as current with ID:", newConversation.id);
    return newConversation.id;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Conversation creation aborted');
      return null;
    }
    console.error('Error creating conversation:', error);
    toast.error('Could not create a new conversation');
    return null;
  } finally {
    // Always ensure creating flag is reset
    loadingStates.creating = false;
    loadingStates.abortController = null;
  }
};

export const setCurrentConversationIdAction = (set: Function, get: () => ChatStore) => async (id: string) => {
  if (!id) {
    console.error("Invalid conversation ID provided");
    return;
  }
  
  console.log("Setting current conversation to:", id);
  
  // Verify the conversation exists in our state before setting it
  const conversation = get().conversations.find(conv => conv.id === id);
  if (!conversation) {
    console.error(`Conversation with id ${id} not found in state`);
    console.log("Available conversations:", get().conversations.map(c => c.id));
    return;
  }
  
  // Set the conversation as current immediately for better UX
  set({ currentConversationId: id });
  
  try {
    // Load messages in the background
    await get().loadMessagesForConversation(id);
  } catch (error) {
    console.error(`Error loading messages for conversation ${id}:`, error);
    // Don't revert the current conversation ID, as the user has already switched
    // Just inform them of the error
    toast.error('Could not load messages for this conversation');
  }
};

export const deleteConversationAction = (set: Function, get: () => ChatStore) => async (id: string) => {
  const { conversations, currentConversationId } = get();
  
  // Don't delete if it's the only conversation
  if (conversations.length <= 1) {
    console.log("Can't delete the only conversation");
    toast.error("You need at least one conversation");
    return;
  }
  
  // Prevent multiple delete operations on the same conversation
  if (loadingStates.deleting.has(id)) {
    console.log(`Already deleting conversation ${id}, please wait`);
    return;
  }
  
  try {
    loadingStates.deleting.add(id);
    
    // Optimistically update UI first for better UX
    const updatedConversations = conversations.filter(conv => conv.id !== id);
    const newCurrentId = id === currentConversationId ? updatedConversations[0].id : currentConversationId;
    
    set({
      conversations: updatedConversations,
      currentConversationId: newCurrentId,
    });
    
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
        
        // Revert the change if database update fails
        set({ conversations });
        toast.error('Could not delete conversation');
        loadingStates.deleting.delete(id);
        return;
      } else {
        console.log("Successfully deleted conversation from database");
        toast.success('Conversation deleted');
      }
    }
    
    console.log("Conversation deleted. New current conversation:", newCurrentId);
    loadingStates.deleting.delete(id);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    toast.error('Could not delete conversation');
    loadingStates.deleting.delete(id);
  }
};

export const updateConversationTitleAction = (set: Function, get: () => ChatStore) => async (id: string, title: string) => {
  if (loadingStates.updating.has(id)) {
    console.log(`Already updating conversation ${id}, please wait`);
    return;
  }
  
  try {
    loadingStates.updating.add(id);
    
    // Update locally first for responsive UI
    set((state: ChatStore) => ({
      conversations: state.conversations.map(conv => 
        conv.id === id ? { ...conv, title, updatedAt: new Date() } : conv
      )
    }));
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error updating conversation title:', error);
        toast.error('Could not update conversation title');
      } else {
        console.log("Successfully updated conversation title");
      }
    }
    
    loadingStates.updating.delete(id);
  } catch (error) {
    console.error('Error updating conversation title:', error);
    toast.error('Could not update conversation title');
    loadingStates.updating.delete(id);
  }
};
