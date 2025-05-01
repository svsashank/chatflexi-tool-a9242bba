
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Conversation } from '@/types';
import { ChatStore } from '../types';

// Track global conversation action states
const globalState = {
  creating: false,
  creationPromise: null as Promise<string | null> | null,
  deleting: new Set<string>(),
  updating: new Set<string>(),
  abortController: null as AbortController | null,
  currentRequest: null as AbortController | null,
  lastConversationCreated: null as string | null, // Track most recently created conversation
  lastCreationTime: 0, // When last conversation was created
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
    // Check if there's already a global creation in progress - return its promise if possible
    if (globalState.creating && globalState.creationPromise) {
      console.log("Using existing conversation creation promise");
      return await globalState.creationPromise;
    }
    
    // Check if we have recently created a conversation
    const now = Date.now();
    if (globalState.lastConversationCreated && 
        now - globalState.lastCreationTime < 5000) { // 5 second window
      console.log(`Recently created conversation ${globalState.lastConversationCreated}, reusing it`);
      return globalState.lastConversationCreated;
    }
    
    // Check if user has existing conversations and one is selected
    const currentState = get();
    if (currentState.conversations.length > 0 && currentState.currentConversationId) {
      console.log(`User already has a selected conversation: ${currentState.currentConversationId}, not creating a new one`);
      return currentState.currentConversationId;
    }
    
    // Create new abort controller and cancel any existing request
    if (globalState.currentRequest) {
      console.log("Aborting previous conversation creation request");
      globalState.currentRequest.abort();
    }
    
    globalState.currentRequest = new AbortController();
    const { signal } = globalState.currentRequest;
    
    // Set creation state
    globalState.creating = true;
    console.log("Creating new conversation...");
    
    // Create a promise for this conversation creation that can be reused
    globalState.creationPromise = (async () => {
      // Return early if aborted before we even started
      if (signal.aborted) {
        console.log("Conversation creation aborted before starting");
        return null;
      }
      
      const newConversation: Conversation = {
        id: uuidv4(),
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        contextSummary: '',
      };
      
      // Get current user
      const sessionResponse = await supabase.auth.getSession();
      
      // Return early if aborted during auth check
      if (signal.aborted) {
        console.log('Conversation creation aborted after auth check');
        return null;
      }
      
      const session = sessionResponse.data.session;
      
      if (!session?.user) {
        console.error('No authenticated user found');
        toast.error('Authentication required to create conversations');
        return null;
      }
      
      // Check if request was aborted during authentication check
      if (signal.aborted) {
        console.log('Conversation creation aborted after auth check');
        return null;
      }
      
      // Store in database
      const response = await supabase
        .from('conversations')
        .insert({
          id: newConversation.id,
          user_id: session.user.id,
          title: newConversation.title,
          created_at: newConversation.createdAt.toISOString(),
          updated_at: newConversation.updatedAt.toISOString()
        });
        
      // Check if aborted during database operation
      if (signal.aborted) {
        console.log('Conversation creation aborted during database operation');
        return null;
      }
      
      if (response.error) {
        console.error('Error creating conversation in database:', response.error);
        toast.error('Could not create a new conversation');
        return null;
      }
      
      console.log("Successfully saved new conversation to database");
      
      // Check if aborted before state update
      if (signal.aborted) {
        console.log('Conversation creation aborted before state update');
        return null;
      }
      
      // Update local state
      set((state: ChatStore) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: newConversation.id,
      }));
      
      // Update our tracking of the most recently created conversation
      globalState.lastConversationCreated = newConversation.id;
      globalState.lastCreationTime = Date.now();
      
      console.log("New conversation created and set as current with ID:", newConversation.id);
      return newConversation.id;
    })();
    
    // Wait for the promise and return its result
    return await globalState.creationPromise;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Conversation creation aborted');
      return null;
    }
    console.error('Error creating conversation:', error);
    toast.error('Could not create a new conversation');
    return null;
  } finally {
    // Always reset the global creation state
    globalState.creating = false;
    globalState.creationPromise = null;
    globalState.currentRequest = null;
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
  if (globalState.deleting.has(id)) {
    console.log(`Already deleting conversation ${id}, please wait`);
    return;
  }
  
  try {
    globalState.deleting.add(id);
    
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
        globalState.deleting.delete(id);
        return;
      } else {
        console.log("Successfully deleted conversation from database");
        toast.success('Conversation deleted');
      }
    }
    
    console.log("Conversation deleted. New current conversation:", newCurrentId);
    globalState.deleting.delete(id);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    toast.error('Could not delete conversation');
    globalState.deleting.delete(id);
  }
};

export const updateConversationTitleAction = (set: Function, get: () => ChatStore) => async (id: string, title: string) => {
  if (globalState.updating.has(id)) {
    console.log(`Already updating conversation ${id}, please wait`);
    return;
  }
  
  try {
    globalState.updating.add(id);
    
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
    
    globalState.updating.delete(id);
  } catch (error) {
    console.error('Error updating conversation title:', error);
    toast.error('Could not update conversation title');
    globalState.updating.delete(id);
  }
};
