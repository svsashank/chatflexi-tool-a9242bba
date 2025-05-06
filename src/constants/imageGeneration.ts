
// Available image generation models by provider

export const IMAGE_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI DALL-E',
    description: 'Generate realistic and artistic images with OpenAI\'s DALL-E models',
    models: [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: 'Most advanced image generation with accurate details',
        sizes: ['1024x1024', '1792x1024', '1024x1792'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural']
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        description: 'Efficient image generation at lower cost',
        sizes: ['256x256', '512x512', '1024x1024'],
        qualities: ['standard'],
        styles: ['standard']
      }
    ],
    defaultModel: 'dall-e-3',
    maxPromptLength: 4000
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Generate images with Claude\'s multimodal capabilities',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model for image generation'
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced model with excellent quality'
      }
    ],
    defaultModel: 'claude-3-opus-20240229',
    maxPromptLength: 4000
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Generate images with Google\'s Gemini models',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable Gemini model for multimodal tasks'
      }
    ],
    defaultModel: 'gemini-1.5-pro',
    maxPromptLength: 4000
  }
];

export const DEFAULT_IMAGE_PROVIDER = IMAGE_PROVIDERS[0];
export const DEFAULT_PROMPT = "a futuristic city with flying cars and tall skyscrapers";
