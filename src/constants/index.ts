// AI Models
export const AI_MODELS = [
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'OpenAI\'s newest model with enhanced capabilities for April 2025',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI\'s most advanced model, with vision capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1',
    provider: 'krutrim',
    description: 'Krutrim\'s DeepSeek-R1 model with strong reasoning capabilities',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#6366f1', // Indigo color for Krutrim
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
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    provider: 'google',
    description: 'Compact version of Gemini 1.5 Flash optimized for efficiency',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Fast version of Gemini 2.0 with balanced performance',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google',
    description: 'Lightweight version of Gemini 2.0 Flash for efficient processing',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'gemini-2.5-pro-exp-03-25',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s latest experimental flagship model with enhanced capabilities',
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
  {
    id: 'grok-3',
    name: 'Grok-3',
    provider: 'xai',
    description: 'xAI\'s advanced model with enhanced reasoning capabilities',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#1d9bf0', // Twitter blue
  },
  {
    id: 'grok-3-mini',
    name: 'Grok-3 Mini',
    provider: 'xai',
    description: 'Efficient and cost-effective version of Grok-3',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#1d9bf0', // Twitter blue
  },
  {
    id: 'gpt-4.1-preview',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'OpenAI\'s newest model with enhanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
  }
];

export const DEFAULT_MODEL = AI_MODELS[0];
