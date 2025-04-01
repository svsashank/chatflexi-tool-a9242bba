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
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Smaller, faster, and more cost-effective version of GPT-4o',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and efficient text generation model',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    provider: 'openai',
    description: 'Preview of OpenAI\'s 4.5 generation model with enhanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    description: 'OpenAI\'s advanced reasoning model with specialized capabilities',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    description: 'Compact version of o1 with efficient performance',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'o1-pro',
    name: 'o1 Pro',
    provider: 'openai',
    description: 'Enhanced version of o1 with premium capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    description: 'Compact third-generation model optimized for efficiency',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
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
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Faster and more efficient version of Gemini 1.5',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'gemini-pro-latest',
    name: 'Gemini 2.0 Pro',
    provider: 'google',
    description: 'Google\'s advanced model with strong reasoning capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Faster version of Gemini 2.0 with balanced performance',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'models/gemini-1.5-pro-latest',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s latest flagship model with enhanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'models/gemini-1.5-flash-latest',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Efficient version of Google\'s latest model with fast response times',
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
