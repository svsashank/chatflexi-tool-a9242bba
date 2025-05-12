
import { supabase } from "@/integrations/supabase/client";
import { ImageGenerationRequest, GeneratedImage } from "@/types";
import { v4 as uuidv4 } from "uuid";

export const generateImage = async (request: ImageGenerationRequest): Promise<GeneratedImage[]> => {
  try {
    console.log("Sending image generation request:", request);
    
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt: request.prompt,
        provider: request.provider,
        model: request.model,
        size: request.size,
        quality: request.quality,
        style: request.style,
        n: request.numberOfImages || 1
      }
    });

    if (error) {
      console.error('Error generating image:', error);
      throw new Error(error.message || 'Failed to generate image');
    }

    if (!data?.images || data.images.length === 0) {
      console.error('No images were returned from the API');
      throw new Error('No images were generated');
    }

    console.log('Images generated successfully:', data.images.length);
    
    // Map the API response to our GeneratedImage format
    return data.images.map((img: any) => ({
      id: uuidv4(),
      url: img.url,
      prompt: request.prompt,
      timestamp: new Date(),
      provider: request.provider,
      model: request.model
    }));
  } catch (error) {
    console.error('Image generation service error:', error);
    throw error;
  }
};

export const saveImageToChat = async (image: GeneratedImage, conversationId: string) => {
  // This function would be used to save the generated image to a conversation
  // Implementation will depend on how images are stored in conversations
  console.log('Saving image to conversation:', image, conversationId);
  // Implementation here
};
