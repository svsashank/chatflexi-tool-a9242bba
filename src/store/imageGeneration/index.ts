
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
      const images = await generateImage(request);
      
      set((state) => ({ 
        generatedImages: [...images, ...state.generatedImages],
        isGenerating: false
      }));
      
      toast.success(`Successfully generated ${images.length} image(s)`);
    } catch (error) {
      console.error('Error generating image:', error);
      set({ 
        generationError: error instanceof Error ? error.message : 'Unknown error occurred',
        isGenerating: false
      });
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    }
  },
  
  clearImages: () => set({ generatedImages: [] }),
  
  removeImage: (id) => set((state) => ({
    generatedImages: state.generatedImages.filter(img => img.id !== id)
  }))
}));
