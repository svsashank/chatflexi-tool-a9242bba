
// AI Models
export const AI_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI\'s most advanced model, with vision capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fast, compact, and balanced intelligence',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#d33b9a', // Anthropic pink
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced intelligence with advanced reasoning',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#c33693', // Anthropic darker pink
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    description: 'Latest Sonnet model with enhanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#b83995', // Anthropic medium pink
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Anthropic\'s most powerful model for complex tasks',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#b03397', // Anthropic even darker pink
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Google\'s multimodal model with extended context window',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'grok-2-latest',
    name: 'Grok-2',
    provider: 'xai',
    description: 'xAI\'s latest conversational model with real-time knowledge',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#1d9bf0', // Twitter blue
  },
];

export const DEFAULT_MODEL = AI_MODELS[0];
