
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_MODEL } from '@/constants';
import { Conversation } from '@/types';
import { ChatStore } from './types';

// Import all action creators
import { 
  createConversationAction,
  setCurrentConversationAction,
  deleteConversationAction,
  resetConversationsAction
} from './conversationActions';

import { loadUserConversationsAction } from './dataActions';

import {
  addMessageAction,
  selectModelAction,
  generateResponseAction,
  createMessageSlice
} from './messageActions';

// Create an initial conversation
const initialConversation: Conversation = {
  id: uuidv4(),
  title: 'New Conversation',
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Create the store
const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  conversations: [initialConversation],
  currentConversationId: initialConversation.id,
  selectedModel: DEFAULT_MODEL,
  isLoading: false,
  isProcessing: false,
  messages: [],
  user: null,

  // Actions
  createConversation: createConversationAction(set, get),
  setCurrentConversation: setCurrentConversationAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  resetConversations: resetConversationsAction(set), // Passing only set as needed
  addMessage: addMessageAction(set, get),
  selectModel: selectModelAction(set),
  generateResponse: generateResponseAction(set, get),
  loadUserConversations: loadUserConversationsAction(set),
  ...createMessageSlice(set, get)
}));

export default useChatStore;
