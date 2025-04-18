
import { create } from 'zustand';
import { ChatStore } from './types';
import { 
  addMessageAction, 
  createSendMessageAction,
  createRegenerateMessageAction,
  selectModelAction,
  initializeModelAction,
  generateResponseAction,
} from './actions';
import { 
  createConversationAction, 
  setCurrentConversationIdAction, 
  deleteConversationAction,
  updateConversationTitleAction
} from './actions/conversationActions';
import {
  loadConversationsFromDBAction,
  loadMessagesForConversationAction,
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
  processingStatus: null, // New field for detailed processing state
  selectedModel: AI_MODELS[0], // default to the first model
  processingUrls: null, // URL processing state
  
  // Model actions
  setSelectedModel: selectModelAction(set),
  initializeSelectedModel: initializeModelAction(set, get),
  
  // Message state actions
  setProcessingUrls: (message: string | null) => set({ processingUrls: message }),
  
  // Message Actions
  addMessage: addMessageAction(set, get),
  sendMessage: createSendMessageAction(set, get),
  regenerateMessage: createRegenerateMessageAction(set, get),
  generateResponse: async () => await generateResponseAction(set, get)(),
  
  // Conversation Actions
  createConversation: async () => {
    const id = await createConversationAction(set, get)();
    return id;
  },
  setCurrentConversationId: setCurrentConversationIdAction(set, get),
  deleteConversation: deleteConversationAction(set, get),
  updateConversationTitle: updateConversationTitleAction(set, get),
  
  // Database Actions
  loadConversationsFromDB: async () => loadConversationsFromDBAction(set, get)(),
  loadMessagesForConversation: async (conversationId: string) => 
    loadMessagesForConversationAction(set, get)(conversationId),
  
  // State Management Actions
  clearConversations: clearConversationsAction(set),
  handleError: handleErrorAction(set),
  retryRequest: retryRequestAction(set, get),
}));
