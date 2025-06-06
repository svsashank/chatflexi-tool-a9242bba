
import { create } from 'zustand';
import { ChatStore } from './actions/types';
import { 
  addMessageAction, 
  createSendMessageAction,
  createRegenerateMessageAction,
  selectModelAction,
  initializeModelAction,
  findAlternativeModelAction,
  generateResponseAction,
} from './actions';
import { 
  createConversationAction, 
  setCurrentConversationIdAction, 
  deleteConversationAction,
  updateConversationTitleAction,
  generateConversationTitleFromMessage,
} from './actions/conversationActions';
import {
  loadConversationsFromDBAction,
  loadMessagesForConversationAction,
  refreshConversationsAction,
  clearConversationCache,
} from './actions/dataActions';
import {
  clearConversationsAction, 
  handleErrorAction,
  retryRequestAction
} from './actions/stateActions';

// Import AI_MODELS
import { AI_MODELS } from '@/constants';

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  processingStatus: null,
  selectedModel: AI_MODELS[0],
  processingUrls: null,
  
  // Model actions
  setSelectedModel: selectModelAction(set),
  initializeSelectedModel: initializeModelAction(set, get),
  findAlternativeModel: findAlternativeModelAction(set, get),
  
  // Message state actions
  setProcessingUrls: (message: string | null) => set({ processingUrls: message }),
  
  // Message Actions
  addMessage: addMessageAction(set, get),
  sendMessage: createSendMessageAction(set, get),
  regenerateMessage: createRegenerateMessageAction(set, get),
  generateResponse: generateResponseAction(set, get),
  
  // Conversation Actions
  createConversation: createConversationAction(set, get),
  setCurrentConversationId: setCurrentConversationIdAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  updateConversationTitle: updateConversationTitleAction(set, get),
  
  // Database Actions
  loadConversationsFromDB: loadConversationsFromDBAction(set, get),
  loadMessagesForConversation: loadMessagesForConversationAction(set),
  refreshConversations: refreshConversationsAction(set, get),
  
  // State Management Actions
  clearConversations: clearConversationsAction(set),
  handleError: handleErrorAction(set),
  retryRequest: retryRequestAction(set, get),
}));

export { generateConversationTitleFromMessage };
