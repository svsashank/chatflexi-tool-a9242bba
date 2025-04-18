
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Create a new conversation
export const createConversationAction = (set, get) => async () => {
  // Prevent duplicate conversation creation
  if (get().isLoading) {
    console.log("Conversation creation already in progress, skipping");
    return get().currentConversationId;
  }
  
  const newId = uuidv4();
  const currentTime = new Date();
  
  // Update local state immediately
  set((state) => ({
    conversations: [
      {
        id: newId,
        title: "New Conversation",
        messages: [],
        createdAt: currentTime,
        updatedAt: currentTime,
        contextSummary: ""
      },
      ...state.conversations,
    ],
    currentConversationId: newId,
  }));
  
  // Check for authentication before saving to database
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      const { error } = await supabase
        .from('conversations')
        .insert([{
          id: newId,
          user_id: session.user.id,
          title: "New Conversation",
          created_at: currentTime.toISOString(),
          updated_at: currentTime.toISOString()
        }]);
        
      if (error) {
        console.error("Error saving conversation to database:", error);
        toast.error("Failed to save conversation to database");
      } else {
        console.log("Successfully saved new conversation to database");
      }
    } catch (error) {
      console.error("Error saving conversation to database:", error);
      toast.error("Failed to save conversation to database");
    }
  } else {
    console.log("User not authenticated, skipping database save");
  }
  
  console.log(`New conversation created and set as current with ID: ${newId}`);
  return newId;
};

// Set the current conversation ID
export const setCurrentConversationIdAction = (set, get) => (id) => {
  const conversations = get().conversations;
  const conversation = conversations.find(c => c.id === id);
  
  if (conversation) {
    set({ 
      currentConversationId: id,
      isLoading: false 
    });
  } else {
    console.error(`Conversation with ID ${id} not found`);
  }
};

// Delete a conversation
export const deleteConversationAction = (set, get) => async (id) => {
  const conversations = get().conversations;
  const currentConversationId = get().currentConversationId;
  
  // Update state first (optimistic update)
  const remainingConversations = conversations.filter(c => c.id !== id);
  
  set({ 
    conversations: remainingConversations,
    currentConversationId: id === currentConversationId 
      ? (remainingConversations[0]?.id || null) 
      : currentConversationId
  });
  
  // Check for authentication before deleting from database
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      // Delete messages first due to foreign key constraints
      const { error: messagesError } = await supabase
        .from('conversation_messages')
        .delete()
        .eq('conversation_id', id);
      
      if (messagesError) {
        console.error("Error deleting conversation messages from database:", messagesError);
      }
      
      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      
      if (conversationError) {
        console.error("Error deleting conversation from database:", conversationError);
        toast.error("Failed to delete conversation from database");
      }
    } catch (error) {
      console.error("Error deleting conversation from database:", error);
      toast.error("Failed to delete conversation from database");
    }
  }
  
  // If we deleted the current conversation, create a new one if there are none left
  if (id === currentConversationId && remainingConversations.length === 0) {
    await get().createConversation();
  }
};

// Update the title of a conversation
export const updateConversationTitleAction = (set, get) => async (id, title) => {
  // Update state
  set(state => ({
    conversations: state.conversations.map(c =>
      c.id === id ? { ...c, title, updatedAt: new Date() } : c
    )
  }));
  
  // Check for authentication before updating in database
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error("Error updating conversation title in database:", error);
        toast.error("Failed to update conversation title in database");
      }
    } catch (error) {
      console.error("Error updating conversation title in database:", error);
      toast.error("Failed to update conversation title in database");
    }
  }
};
