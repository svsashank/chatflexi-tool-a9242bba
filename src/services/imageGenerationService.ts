
import { supabase } from "@/integrations/supabase/client";
import { AIModel } from "@/types";

export interface GeneratedImage {
  imageUrl: string;
  revisedPrompt?: string;
  model: string;
  provider: string;
}

// Generates an image using the specified model
export const generateImage = async (
  prompt: string,
  model: AIModel
): Promise<GeneratedImage> => {
  try {
    console.log('Sending image generation request:', { 
      model: model.name, 
      provider: model.provider, 
      promptPreview: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
    });
    
    // Call the Supabase Edge Function with retries for better reliability
    let attempts = 0;
    const maxAttempts = 2;
    let lastError;
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke('image-generation', {
          body: { 
            prompt,
            provider: model.provider,
            modelId: model.id
          }
        });
        
        if (error) {
          console.error(`Attempt ${attempts + 1}: Error with ${model.provider} image generation API:`, error);
          lastError = error;
          attempts++;
          // Wait before retry
          if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        console.log('Received response from image generation API:', {
          provider: data.provider,
          model: data.model,
          imageUrl: data.imageUrl ? 'Image URL received' : 'No image URL received'
        });
        
        return {
          imageUrl: data.imageUrl,
          revisedPrompt: data.revisedPrompt,
          model: data.model || model.id,
          provider: data.provider || model.provider
        };
      } catch (error) {
        console.error(`Attempt ${attempts + 1}: Error with ${model.provider} image generation API:`, error);
        lastError = error;
        attempts++;
        // Wait before retry
        if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If we get here, all attempts failed
    throw new Error(lastError?.message || 'Failed to generate image after multiple attempts');
  } catch (error: any) {
    console.error(`Error with ${model.provider} image generation API:`, error);
    throw error;
  }
};
