
import { Message, Conversation, AIModel } from '@/types';
import { GeneratedImage } from '@/services/imageGenerationService';

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
  // Update return type to match the implementation
  generateImage: (prompt: string, enhancePrompt?: boolean) => Promise<GeneratedImage | void>;
}

export type ChatStore = ChatState & ChatStoreActions;
