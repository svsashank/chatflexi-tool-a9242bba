
// AI Models
export const AI_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI\'s most advanced model, with vision capabilities',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#10a37f', // OpenAI green
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fast, compact, and balanced intelligence',
    capabilities: ['text', 'code'],
    avatarColor: '#d33b9a', // Anthropic pink
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Reliable intelligence across complex tasks',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#c33693', // Anthropic darker pink
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Anthropic\'s most powerful model for complex tasks',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#b03397', // Anthropic even darker pink
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Google\'s multimodal model with extended context window',
    capabilities: ['text', 'images', 'code'],
    avatarColor: '#4285f4', // Google blue
  },
  {
    id: 'grok-1',
    name: 'Grok-1',
    provider: 'xai',
    description: 'xAI\'s conversational model with latest knowledge',
    capabilities: ['text', 'code'],
    avatarColor: '#1d9bf0', // Twitter blue
  },
];

export const DEFAULT_MODEL = AI_MODELS[0];
