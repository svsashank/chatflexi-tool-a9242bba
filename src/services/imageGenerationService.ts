
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
        console.log(`Attempt ${attempts + 1}: Invoking image-generation function with provider ${model.provider} and model ${model.id}`);
        
        const { data, error } = await supabase.functions.invoke('image-generation', {
          body: { 
            prompt, // Pass the original prompt directly
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
        
        // Log the full response for debugging
        console.log('Received response from image generation API:', data);
        
        // Check if the response contains an error message from the backend
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (!data.imageUrl) {
          throw new Error('No image URL received from the API');
        }
        
        // Add an extra check for incomplete base64 data
        if (data.imageUrl.startsWith('data:image') && data.imageUrl.length < 100) {
          throw new Error('Invalid or incomplete image data received');
        }
        
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
