
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  model: AIModel;
  timestamp: Date;
  tokens?: {
    input: number;
    output: number;
    reasoning?: number;
  };
  computeCredits?: number;
  images?: string[];
  files?: string[];
  webSearchResults?: any[];
  fileSearchResults?: any[];
  reasoningContent?: string;
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

export type AIModelCapability = 'text' | 'images' | 'code' | 'audio' | 'reasoning';

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: Array<AIModelCapability>;
  avatarColor: string;
  contextWindow?: number;
  responseSpeed: 'very-fast' | 'fast' | 'medium' | 'slow';
  pricing: 'low' | 'standard' | 'premium';
  specialMode?: string;
  version?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  showReasoning?: boolean;
};

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
