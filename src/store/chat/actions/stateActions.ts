
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '@/types';

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
    currentConversationId: newConversation.id 
  });
  
  console.log("Cleared all conversations and created a new empty one");
};
