
import { AIModel } from '../types';

export const AI_MODELS: AIModel[] = [
  // OpenAI models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most powerful model for complex tasks, reasoning, and creative content.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#19C37D',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Efficient and cost-effective version of GPT-4o with strong capabilities.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#19C37D',
  },
  
  // Anthropic models
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Advanced reasoning and comprehension with superior context length.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#F5BF40',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance and efficiency for most use cases.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#F5BF40',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fast and efficient model for simpler tasks and conversations.',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#F5BF40',
  },
  
  // Google models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: "Google's multimodal model with strong performance on diverse tasks.",
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#4285F4',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    description: 'Efficient model for quick responses and cost-effective deployments.',
    capabilities: ['text', 'code'],
    avatarColor: '#4285F4',
  },
  
  // Meta models
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'Meta',
    description: 'Largest Llama 3 model with superior reasoning and coding abilities.',
    capabilities: ['text', 'code'],
    avatarColor: '#1877F2',
  },
  {
    id: 'llama-3-8b',
    name: 'Llama 3 8B',
    provider: 'Meta',
    description: 'Compact yet powerful open model for efficient deployment.',
    capabilities: ['text', 'code'],
    avatarColor: '#1877F2',
  },
  
  // xAI
  {
    id: 'grok-1',
    name: 'Grok-1',
    provider: 'xAI',
    description: 'First generation model from xAI with real-time knowledge capabilities.',
    capabilities: ['text', 'code'],
    avatarColor: '#FF0000',
  },
  
  // Mistral models
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'Mistral',
    description: 'Efficient mixture-of-experts model with strong multilingual capabilities.',
    capabilities: ['text', 'code'],
    avatarColor: '#7928CA',
  },
];

export const DEFAULT_MODEL = AI_MODELS[0];
