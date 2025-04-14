
import { Conversation as ConversationType, AIModel, Message } from '@/types';

export type Conversation = ConversationType;

export interface ChatStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  selectedModel: AIModel;
  processingUrls: string | null; // Add the URL processing state
  
  // Actions
  setCurrentConversationId: (id: string) => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  sendMessage: (
    content: string, 
    images?: string[], 
    files?: string[]
  ) => void;
  generateResponse: () => Promise<void>;
  regenerateMessage: () => Promise<void>;
  setSelectedModel: (model: AIModel) => void;
  setProcessingUrls: (message: string | null) => void; // Add this method
  clearConversations: () => void;
  loadConversationsFromDB: () => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  addTestConversations?: (count?: number) => void;
}
