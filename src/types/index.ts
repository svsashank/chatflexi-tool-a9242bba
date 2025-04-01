
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  model: AIModel;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
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
