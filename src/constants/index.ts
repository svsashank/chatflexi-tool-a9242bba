
import { AIModel } from '../types';

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most powerful model for complex tasks, reasoning, and creative content.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#19C37D',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Advanced reasoning and comprehension with superior context length.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#F5BF40',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Google\'s multimodal model with strong performance on diverse tasks.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#4285F4',
  },
  {
    id: 'llama-3',
    name: 'Llama 3',
    provider: 'Meta',
    description: 'Open model with competitive performance on reasoning and coding.',
    capabilities: ['text', 'code'],
    avatarColor: '#1877F2',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'Mistral',
    description: 'Efficient mixture-of-experts model with strong multilingual capabilities.',
    capabilities: ['text', 'code'],
    avatarColor: '#7928CA',
  }
];

export const DEFAULT_MODEL = AI_MODELS[0];
