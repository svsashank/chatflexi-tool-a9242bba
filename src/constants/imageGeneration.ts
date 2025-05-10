
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
    id: 'flux',
    name: 'Blackforest Labs',
    description: 'Generate images with Blackforest Labs\' Flux models',
    maxPromptLength: 1000,
    defaultModel: 'black-forest-labs/FLUX.1-schnell',
    models: [
      {
        id: 'black-forest-labs/FLUX.1-schnell',
        name: 'FLUX.1 Schnell',
        description: 'Fast, high-quality image generation model by Blackforest Labs',
        sizes: ['1024x1024'],
        qualities: ['standard'],
        styles: []
      },
      {
        id: 'black-forest-labs/FLUX.1.1-pro',
        name: 'FLUX.1.1 Pro',
        description: 'High-quality premium image generation model by Blackforest Labs',
        sizes: ['1024x1024', '1152x896', '896x1152', '1216x832', '832x1216'],
        qualities: ['standard', 'high'],
        styles: []
      }
    ]
  }
];

export const DEFAULT_PROMPT = "a futuristic city with flying cars and tall skyscrapers";
export const DEFAULT_IMAGE_PROVIDER = IMAGE_PROVIDERS[0];
