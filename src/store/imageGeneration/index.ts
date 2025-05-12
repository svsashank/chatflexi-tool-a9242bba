
import { create } from 'zustand';
import { ImageGenerationState, ImageGenerationRequest, GeneratedImage } from '@/types';
import { generateImage } from '@/services/imageGenerationService';
import { toast } from 'sonner';

export const useImageGenerationStore = create<ImageGenerationState & {
  setRequest: (request: ImageGenerationRequest) => void;
  generateImage: (request: ImageGenerationRequest) => Promise<void>;
  clearImages: () => void;
  removeImage: (id: string) => void;
}>((set, get) => ({
  isGenerating: false,
  generationError: null,
  generatedImages: [],
  currentRequest: null,
  
  setRequest: (request) => set({ currentRequest: request }),
  
  generateImage: async (request) => {
    set({ isGenerating: true, generationError: null });
    
    try {
      console.log("Generating image with request:", request);
      const images = await generateImage(request);
      
      if (!images || images.length === 0) {
        throw new Error("No images were returned");
      }
      
      set((state) => ({ 
        generatedImages: [...images, ...state.generatedImages],
        isGenerating: false
      }));
      
      toast.success(`Successfully generated ${images.length} image(s)`);
      return;
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      set({ 
        generationError: errorMessage,
        isGenerating: false
      });
      
      toast.error(`Failed to generate image: ${errorMessage}`);
      throw error; // Re-throw to allow component-level handling
    }
  },
  
  clearImages: () => set({ generatedImages: [] }),
  
  removeImage: (id) => set((state) => ({
    generatedImages: state.generatedImages.filter(img => img.id !== id)
  }))
}));
