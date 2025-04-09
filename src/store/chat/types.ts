
import { Message, Conversation, AIModel } from '@/types';

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
  isImageGenerating: boolean;
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
  sendMessage: (content: string, images?: string[]) => void;
  regenerateMessage: () => Promise<void>;
  // Updated to match implementation with enhancePrompt parameter
  generateImage: (prompt: string, enhancePrompt?: boolean) => Promise<void>;
}

export type ChatStore = ChatState & ChatStoreActions;
