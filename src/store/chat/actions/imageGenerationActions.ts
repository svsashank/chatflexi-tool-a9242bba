
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { ChatStore } from '../types';
import { GeneratedImage } from '@/types';
import { toast } from 'sonner';

export const createImageGenerationActions = (
  set: (state: Partial<ChatStore>) => void,
  get: () => ChatStore
) => {
  return {
    generateImage: async (prompt: string, enhancePrompt: boolean = false): Promise<GeneratedImage> => {
      set({ isImageGenerating: true });
      
      try {
        const { selectedModel } = get();
        
        // Check if the model supports image generation
        if (!selectedModel.capabilities.includes('imageGeneration')) {
          throw new Error(`The selected model (${selectedModel.name}) does not support image generation`);
        }
        
        console.log(`Generating image with prompt: ${prompt} (enhance: ${enhancePrompt})`);
        
        // Call the Supabase Edge Function for image generation
        const { data, error } = await supabase.functions.invoke('image-generation', {
          body: { 
            prompt,
            provider: selectedModel.provider,
            modelId: selectedModel.id,
            enhancePrompt
          }
        });
        
        if (error) {
          console.error('Image generation error:', error);
          toast.error(`Failed to generate image: ${error.message}`);
          throw new Error(`Failed to generate image: ${error.message}`);
        }
        
        const generatedImage: GeneratedImage = {
          imageUrl: data.imageUrl,
          prompt: prompt,
          revisedPrompt: data.revisedPrompt,
          model: data.model || selectedModel.id,
          provider: data.provider || selectedModel.provider
        };
        
        console.log('Generated image:', generatedImage);
        
        return generatedImage;
      } catch (error: any) {
        console.error('Error generating image:', error);
        toast.error(error.message || 'Failed to generate image');
        throw error;
      } finally {
        set({ isImageGenerating: false });
      }
    },
    
    setImageGenerating: (isGenerating: boolean) => {
      set({ isImageGenerating: isGenerating });
    }
  };
};
