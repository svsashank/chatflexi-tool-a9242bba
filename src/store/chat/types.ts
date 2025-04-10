
import { Conversation, AIModel, Message } from '@/types';

export interface ChatStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
  
  // Actions
  setCurrentConversationId: (id: string) => void;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string, images?: string[], files?: string[]) => void;
  generateResponse: () => Promise<void>;
  regenerateMessage: () => Promise<void>;
  setSelectedModel: (model: AIModel) => void;
  clearConversations: () => void;
  loadConversationsFromDB: () => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  addTestConversations: (count?: number) => void;
}
