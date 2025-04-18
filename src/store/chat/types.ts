import { AIModel } from '@/types';
import { Message } from '@/types';
import { Conversation } from '@/types';

export type ChatStore = {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  processingStatus: string | null; // Add processing status for detailed UI indicators
  selectedModel: AIModel;
  processingUrls: string | null;
  
  // Model actions
  setSelectedModel: (model: AIModel) => void;
  initializeSelectedModel: () => void;
  
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
  
  // Database Actions
  loadConversationsFromDB: () => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  
  // State Management Actions
  clearConversations: () => void;
  handleError: (message: string) => void;
  retryRequest: () => void;
};
