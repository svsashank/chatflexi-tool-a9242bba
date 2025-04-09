
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  model: AIModel;
  timestamp: Date;
  tokens?: {
    input: number;
    output: number;
  };
  computeCredits?: number;
  images?: string[]; // URLs or base64 data for images
  generatedImages?: GeneratedImage[]; // Images generated from this message
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  contextSummary: string; // Added for improved context tracking
  userId?: string; // Added to link conversations to users
}

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: Array<'text' | 'images' | 'code' | 'audio' | 'imageGeneration'>;
  avatarColor: string;
}

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
  model: string;
  provider: string;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: AIModel;
  isLoading: boolean;
  isImageGenerating: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
