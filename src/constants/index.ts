// AI Models
export const AI_MODELS = [
  // OpenAI O4 Series - Latest and Most Capable
  {
    id: 'o4-mini-high',
    name: 'O4 Mini High',
    provider: 'openai',
    description: 'High-end version of O4 Mini with enhanced capabilities',
    capabilities: ['text', 'images', 'code', 'reasoning'] as Array<'text' | 'images' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'premium' as 'premium',
    reasoningEffort: 'high' as 'high',
    showReasoning: true
  },
  {
    id: 'o4-mini',
    name: 'O4 Mini',
    provider: 'openai',
    description: 'Compact version of O4 with excellent performance',
    capabilities: ['text', 'images', 'code', 'reasoning'] as Array<'text' | 'images' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'standard' as 'standard',
    reasoningEffort: 'high' as 'high',
    showReasoning: true
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'Advanced model with top-tier capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'premium' as 'premium'
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Compact version of GPT-4.1 with excellent performance',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    description: 'Smallest version of GPT-4.1, ideal for efficiency',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 32000,
    responseSpeed: 'very-fast' as 'very-fast',
    pricing: 'low' as 'low'
  },
  
  // OpenAI Production Models - 4o Series
  {
    id: 'gpt-4o-2024-11-20',
    name: 'GPT-4o (Nov 2024)',
    provider: 'openai',
    description: 'Latest version of GPT-4o with improvements',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard',
    version: '2024-11-20'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Balanced model with vision capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Smaller, faster version of GPT-4o',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'low' as 'low'
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'ChatGPT-4o Latest',
    provider: 'openai',
    description: 'Latest ChatGPT model with best performance',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  
  // OpenAI O1 Series - Fast Responders
  {
    id: 'o1-pro',
    name: 'O1 Pro',
    provider: 'openai',
    description: 'Professional version of O1 with enhanced reasoning',
    capabilities: ['text', 'code', 'reasoning'] as Array<'text' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'premium' as 'premium',
    reasoningEffort: 'high' as 'high',
    showReasoning: true
  },
  {
    id: 'o1',
    name: 'O1',
    provider: 'openai',
    description: 'Mid-range model with good reasoning capabilities',
    capabilities: ['text', 'code', 'reasoning'] as Array<'text' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'standard' as 'standard',
    reasoningEffort: 'high' as 'high',
    showReasoning: true
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    provider: 'openai',
    description: 'Preview version of O1 with latest features',
    capabilities: ['text', 'code', 'reasoning'] as Array<'text' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard',
    reasoningEffort: 'high' as 'high',
    showReasoning: true
  },
  {
    id: 'o1-mini-2024-09-12',
    name: 'O1 Mini (Sep 2024)',
    provider: 'openai',
    description: 'Compact O1 model with excellent speed',
    capabilities: ['text', 'code', 'reasoning'] as Array<'text' | 'code' | 'reasoning'>,
    avatarColor: '#10a37f', // OpenAI green
    contextWindow: 32000,
    responseSpeed: 'very-fast' as 'very-fast',
    pricing: 'low' as 'low',
    version: '2024-09-12',
    reasoningEffort: 'medium' as 'medium',
    showReasoning: true
  },
  
  // Anthropic Claude 3 Series
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most powerful Claude model with superior reasoning',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#b03397', // Anthropic darker pink
    contextWindow: 200000,
    responseSpeed: 'slow' as 'slow',
    pricing: 'premium' as 'premium'
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    description: 'Latest Sonnet model with enhanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#b83995', // Anthropic medium pink
    contextWindow: 200000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'claude-3.7-sonnet-thinking',
    name: 'Claude 3.7 Sonnet Thinking',
    provider: 'anthropic',
    description: 'Enhanced reasoning with visible thinking process',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#b83995', // Anthropic medium pink
    contextWindow: 200000,
    responseSpeed: 'slow' as 'slow',
    pricing: 'premium' as 'premium',
    specialMode: 'thinking'
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance model with advanced reasoning',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#c33693', // Anthropic dark pink
    contextWindow: 200000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient Claude model',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#d33b9a', // Anthropic pink
    contextWindow: 200000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'low' as 'low'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fastest Claude model, ideal for quick responses',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#d33b9a', // Anthropic pink
    contextWindow: 200000,
    responseSpeed: 'very-fast' as 'very-fast',
    pricing: 'low' as 'low'
  },
  
  // Google Gemini Models
  {
    id: 'gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro Preview',
    provider: 'google',
    description: 'Google\'s latest model with advanced capabilities',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
    contextWindow: 1000000, // 1M tokens
    responseSpeed: 'medium' as 'medium',
    pricing: 'premium' as 'premium'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Google\'s multimodal model with large context window',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
    contextWindow: 1000000, // 1M tokens
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Faster and more efficient version of Gemini 1.5',
    capabilities: ['text', 'images', 'code'] as Array<'text' | 'images' | 'code'>,
    avatarColor: '#4285f4', // Google blue
    contextWindow: 1000000, // 1M tokens
    responseSpeed: 'fast' as 'fast',
    pricing: 'low' as 'low'
  },
  
  // xAI Models
  {
    id: 'grok-3-beta',
    name: 'Grok 3 Beta',
    provider: 'xai',
    description: 'Latest xAI model with advanced reasoning',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#1d9bf0', // Twitter blue
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    description: 'xAI\'s production model with good performance',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#1d9bf0', // Twitter blue
    contextWindow: 128000,
    responseSpeed: 'fast' as 'fast',
    pricing: 'low' as 'low'
  },
  
  // DeepSeek Models
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    description: 'Latest DeepSeek model with enhanced capabilities',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#6366f1', // Indigo color for DeepSeek
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Reasoning-focused model with excellent problem-solving',
    capabilities: ['text', 'code'] as Array<'text' | 'code'>,
    avatarColor: '#6366f1', // Indigo color for DeepSeek
    contextWindow: 128000,
    responseSpeed: 'medium' as 'medium',
    pricing: 'standard' as 'standard'
  },
];

export const DEFAULT_MODEL = AI_MODELS[0];

// Additional configurations for the models
export const MODEL_GROUPS = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'xai': 'xAI',
  'deepseek': 'DeepSeek'
};

export const PRICING_TIERS = {
  'low': { label: 'Affordable', description: 'Lowest cost option, great for routine tasks' },
  'standard': { label: 'Standard', description: 'Balanced cost and performance' },
  'premium': { label: 'Premium', description: 'Highest quality, best for complex tasks' }
};

export const SPEED_TIERS = {
  'very-fast': { label: 'Very Fast', description: 'Optimized for quick responses' },
  'fast': { label: 'Fast', description: 'Good balance of speed and quality' },
  'medium': { label: 'Standard', description: 'Balanced processing time' },
  'slow': { label: 'Deliberate', description: 'Takes more time for higher quality' }
};

export const REASONING_EFFORT_TIERS = {
  'low': { label: 'Basic', description: 'Limited reasoning for faster responses' },
  'medium': { label: 'Standard', description: 'Balanced reasoning capabilities' },
  'high': { label: 'Deep', description: 'Extensive reasoning for complex tasks' }
};
