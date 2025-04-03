
import { Message, Conversation, AIModel } from '@/types';

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
}

export interface ChatStoreActions {
  createConversation: () => Promise<void>;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (content: string) => Promise<void>;
  selectModel: (model: AIModel) => void;
  generateResponse: () => Promise<void>;
  loadUserConversations: () => Promise<void>;
  resetConversations: () => void;
}

export interface MessageSlice {
  sendMessage: (content: string) => Promise<void>;
  regenerateMessage: () => Promise<void>;
}

export type ChatStore = ChatState & ChatStoreActions & MessageSlice;
