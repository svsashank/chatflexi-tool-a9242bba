
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '@/types';
import { toast } from 'sonner'; // Use sonner toast for consistency

// Action to clear all conversations and reset state
export const clearConversationsAction = (set: Function) => () => {
  // Create a single empty conversation when clearing all
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
    isLoading: false // Make sure we reset the loading state
  });
  
  console.log("Cleared all conversations and created a new empty one");
};

// Add a new action to handle errors
export const handleErrorAction = (set: Function) => (message: string) => {
  set({ isLoading: false });
  toast.error(message);
  console.error(`Chat error: ${message}`);
};

// Add a retry action for failed requests
export const retryRequestAction = (set: Function, get: Function) => async () => {
  if (get().isLoading) {
    console.log("Already processing a request, cannot retry now");
    return;
  }
  
  const currentConversation = get().conversations.find(c => c.id === get().currentConversationId);
  if (!currentConversation) {
    toast.error("No active conversation found");
    return;
  }
  
  // Find the last user message
  const lastUserMessage = [...currentConversation.messages]
    .reverse()
    .find(m => m.role === 'user');
    
  if (!lastUserMessage) {
    toast.error("No user message found to retry");
    return;
  }
  
  // Call generateResponse to retry
  console.log("Retrying the last request with user message: ", 
    lastUserMessage.content.substring(0, 50) + (lastUserMessage.content.length > 50 ? '...' : ''));
  
  await get().generateResponse();
};
