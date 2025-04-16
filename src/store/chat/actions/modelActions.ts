
import { AI_MODELS, DEFAULT_MODEL } from '@/constants';
import { AIModel } from '@/types';
import { toast } from '@/components/ui/use-toast';

export const selectModelAction = (set: Function) => (model: AIModel) => {
  if (!model) {
    console.error('Attempted to select a null or undefined model');
    return;
  }

  console.log(`Setting selected model to: ${model.name} (${model.id})`);
  
  try {
    // Save selected model to local storage
    localStorage.setItem('selectedModel', JSON.stringify({
      id: model.id,
      name: model.name,
      provider: model.provider
    }));
  } catch (error) {
    console.error('Error saving model to localStorage:', error);
  }
  
  set({ selectedModel: model });
};

export const initializeModelAction = (set: Function, get: Function) => () => {
  console.log('Initializing selected model');
  
  try {
    // Try to load model from localStorage
    const savedModelJson = localStorage.getItem('selectedModel');
    
    if (savedModelJson) {
      try {
        const savedModel = JSON.parse(savedModelJson);
        console.log('Initializing from saved model:', savedModel);
        
        // Find the full model configuration by ID
        const matchedModel = AI_MODELS.find(model => model.id === savedModel.id);
        
        if (matchedModel) {
          console.log(`Found matched model: ${matchedModel.name} (${matchedModel.id})`);
          set({ selectedModel: matchedModel });
          return;
        } else {
          console.log(`Saved model ${savedModel.id} not found in AI_MODELS, using default`);
          localStorage.removeItem('selectedModel'); // Clear invalid model from storage
        }
      } catch (parseError) {
        console.error('Error initializing model from localStorage:', parseError);
        localStorage.removeItem('selectedModel'); // Clear corrupted model from storage
      }
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    toast({
      title: "Error",
      description: "Failed to initialize model preference. Using default model.",
      variant: "destructive", 
    });
  }
  
  // Fall back to default model if nothing is saved or if there was an error
  console.log(`Using default model: ${DEFAULT_MODEL.name} (${DEFAULT_MODEL.id})`);
  set({ selectedModel: DEFAULT_MODEL });
};
