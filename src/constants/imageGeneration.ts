
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
    id: 'google',
    name: 'Google',
    description: 'Generate images with Google\'s Gemini 2.0 Flash Preview',
    maxPromptLength: 1000,
    defaultModel: 'gemini-2-flash',
    models: [
      {
        id: 'gemini-2-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Google\'s latest image generation model',
        sizes: ['1024x1024'],
        qualities: ['standard'],
        styles: []
      }
    ]
  }
];

export const DEFAULT_PROMPT = "a futuristic city with flying cars and tall skyscrapers";
export const DEFAULT_IMAGE_PROVIDER = IMAGE_PROVIDERS[0];
