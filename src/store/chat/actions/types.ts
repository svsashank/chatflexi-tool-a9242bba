
import { AIModel, Conversation, Message } from '@/types';

export type ChatStore = {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  processingStatus: string | null;
  selectedModel: AIModel;
  processingUrls: string | null;
  
  // Model actions
  setSelectedModel: (model: AIModel) => void;
  initializeSelectedModel: () => void;
  findAlternativeModel: () => void;
  
  // Message state actions
  setProcessingUrls: (message: string | null) => void;
  
  // Message Actions
  addMessage: (message: Message) => void;
  sendMessage: (content: string, images?: string[], files?: string[]) => void;
  regenerateMessage: () => void;
  generateResponse: () => Promise<void>;
  
  // Conversation Actions
  createConversation: () => Promise<string>;
  setCurrentConversationId: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  refreshConversations: () => Promise<void>;
  
  // Database Actions
  loadConversationsFromDB: () => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  
  // State Management Actions
  clearConversations: () => void;
  handleError: (message: string) => void;
  retryRequest: () => void;
};
