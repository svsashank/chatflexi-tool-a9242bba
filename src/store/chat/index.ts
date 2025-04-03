
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

import {
  addMessageAction,
  selectModelAction,
  generateResponseAction,
  createMessageSlice
} from './messageActions';

import { loadUserConversationsAction } from './dataActions';

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
  setCurrentConversation: setCurrentConversationAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  resetConversations: resetConversationsAction(set),
  addMessage: addMessageAction(set, get),
  selectModel: selectModelAction(set),
  generateResponse: generateResponseAction(set, get),
  loadUserConversations: loadUserConversationsAction(set),
  
  // Include the message slice
  ...createMessageSlice(set, get)
}));

export default useChatStore;
