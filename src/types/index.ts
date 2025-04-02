
// Define model details
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  capabilities?: string[];
  limitations?: string[];
  contextLength?: number;
  apiSupported?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: AIModel;
  createdAt: string;
  metadata?: {
    usageDisplay?: string;
    [key: string]: any;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  totalTokens: number;
  totalComputePoints: number;
  byModel: Record<string, {
    tokens: number;
    computePoints: number;
  }>;
}
