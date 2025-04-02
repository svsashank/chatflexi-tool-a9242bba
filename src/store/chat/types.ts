
import { Message, Conversation, AIModel } from '@/types';
import { User } from '@supabase/supabase-js';

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
  isProcessing: boolean; // Add this for tracking message processing state
  messages: Message[]; // Add messages array for current conversation
  user: User | null; // Add user property for authentication
}

export interface MessageSlice {
  sendMessage: (content: string) => Promise<void>;
  regenerateMessage: () => Promise<void>;
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

export type ChatStore = ChatState & ChatStoreActions & MessageSlice;
