export interface Message {
  id: string;
  content: string;
  role: 'system' | 'assistant' | 'user';
  model: AIModel;
  timestamp: Date;
  computeCredits?: number;
  tokens?: {
    input: number;
    output: number;
  };
  images?: string[];
  files?: string[];
  webSearchResults?: any[];
  fileSearchResults?: any[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  contextSummary: string;
  userId?: string;
}

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: Array<'text' | 'images' | 'code' | 'audio'>;
  avatarColor: string;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
