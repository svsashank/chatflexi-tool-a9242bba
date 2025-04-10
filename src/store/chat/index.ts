
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_MODEL } from '@/constants';
import { Conversation } from '@/types';
import { ChatStore } from './types';

// Import all action creators
import { 
  createConversationAction,
  setCurrentConversationIdAction,
  deleteConversationAction,
  resetConversationsAction
} from './conversationActions';

import {
  addMessageAction,
  selectModelAction,
  generateResponseAction,
  createSendMessageAction,
  createRegenerateMessageAction
} from './actions';

import { loadUserConversationsAction, loadMessagesForConversationAction } from './dataActions';

// Create an initial conversation
const initialConversation: Conversation = {
  id: uuidv4(),
  title: 'New Conversation',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  contextSummary: '',
};

// Create the store
const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  conversations: [initialConversation],
  currentConversationId: initialConversation.id,
  selectedModel: DEFAULT_MODEL,
  isLoading: false,
  
  // Actions
  createConversation: createConversationAction(set, get),
  setCurrentConversationId: setCurrentConversationIdAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  updateConversationTitle: async (id: string, title: string) => {
    // Placeholder for future implementation
    console.log("Update conversation title:", id, title);
  },
  clearConversations: () => {
    // Simple implementation to clear all conversations
    set({ conversations: [] });
  },
  addMessage: addMessageAction(set, get),
  setSelectedModel: selectModelAction(set),
  generateResponse: generateResponseAction(set, get),
  loadConversationsFromDB: loadUserConversationsAction(set),
  loadMessagesForConversation: loadMessagesForConversationAction(set), // Fixed: properly passing set to the action creator
  addTestConversations: (count = 3) => {
    // Placeholder for adding test conversations
    console.log(`Adding ${count} test conversations`);
  },
  
  // Message slice actions
  sendMessage: createSendMessageAction(set, get),
  regenerateMessage: createRegenerateMessageAction(set, get)
}));

export default useChatStore;
