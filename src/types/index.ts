

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  model: AIModel;
  timestamp: Date;
  tokens?: {
    input: number;
    output: number;
    reasoning?: number; // Add reasoning tokens
  };
  computeCredits?: number;
  images?: string[];
  files?: string[];
  webSearchResults?: any[];
  fileSearchResults?: any[];
  reasoningContent?: string; // Add reasoning content
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
  reasoningEffort?: 'low' | 'medium' | 'high'; // Add reasoning effort
  showReasoning?: boolean; // Whether to show reasoning
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

