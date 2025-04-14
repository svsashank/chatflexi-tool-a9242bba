
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  model: AIModel;
  timestamp: Date;
  tokens?: {
    input: number;
    output: number;
  };
  computeCredits?: number;
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
