
export const DEFAULT_PROMPT = "a futuristic city with flying cars and tall skyscrapers";
export const DEFAULT_IMAGE_PROVIDER = IMAGE_PROVIDERS[0];

export const IMAGE_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Generate images with OpenAI\'s DALL·E models',
    maxPromptLength: 1000,
    defaultModel: 'dall-e-3',
    models: [
      {
        id: 'dall-e-3',
        name: 'DALL·E 3',
        description: 'Most powerful DALL·E model, high resolution with accurate details',
        sizes: ['1024x1024', '1024x1792', '1792x1024'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural']
      },
      {
        id: 'dall-e-2',
        name: 'DALL·E 2',
        description: 'Faster but less detailed image generation',
        sizes: ['256x256', '512x512', '1024x1024'],
        qualities: ['standard'],
        styles: []
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Generate images with Anthropic\'s Claude 3 vision models',
    maxPromptLength: 800,
    defaultModel: 'claude-3-opus',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Highest quality image generation',
        sizes: ['1024x1024'],
        qualities: ['standard'],
        styles: []
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced quality and speed',
        sizes: ['1024x1024'],
        qualities: ['standard'],
        styles: []
      }
    ]
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Generate images with Google\'s Gemini models',
    maxPromptLength: 1000,
    defaultModel: 'gemini-pro',
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google\'s most capable image generation model',
        sizes: ['1024x1024'],
        qualities: ['standard'],
        styles: []
      }
    ]
  }
];
