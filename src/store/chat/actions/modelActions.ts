
import { AI_MODELS } from "@/constants";
import { AIModel } from "@/types"; 
import { ChatStore } from "../types";
import { StoreApi } from "zustand";
import { toast } from "sonner";

export const selectModelAction = (set: Function) => (model: AIModel) => {
  // Save selected model in localStorage
  try {
    localStorage.setItem('selectedModel', JSON.stringify(model));
    toast.success(`Model changed to ${model.name}`);
  } catch (error) {
    console.error("Error saving model to localStorage:", error);
    toast.error("Failed to save model preference");
  }
  
  // Update store with selected model
  set({ selectedModel: model });
};

export const initializeModelAction = (set: Function, get: StoreApi<ChatStore>['getState']) => () => {
  try {
    console.log("Initializing from saved model");
    
    // Try to get the saved model from localStorage
    const savedModel = localStorage.getItem('selectedModel');
    
    if (savedModel) {
      // Parse the saved model
      const model = JSON.parse(savedModel);
      console.log("Initializing from saved model:", model);
      
      // Validate that the parsed model matches one of our AI_MODELS by ID
      const foundModel = AI_MODELS.find(m => m.id === model.id);
      
      if (foundModel) {
        // Set the found model in the store
        set({ selectedModel: foundModel });
        console.log(`Loaded saved model preference: ${foundModel.name}`);
      } else {
        // If saved model not found in our list (may be due to model updates), use the default
        set({ selectedModel: AI_MODELS[0] });
        console.log(`Saved model ID ${model.id} not found in AI_MODELS, using default model ${AI_MODELS[0].name}`);
        
        // Save the default model to localStorage to prevent future mismatches
        try {
          localStorage.setItem('selectedModel', JSON.stringify(AI_MODELS[0]));
        } catch (saveError) {
          console.error("Error updating model in localStorage:", saveError);
        }
      }
    } else {
      // If no saved preference, initialize with the default model
      set({ selectedModel: AI_MODELS[0] });
      console.log(`No saved model preference found, using default model ${AI_MODELS[0].name}`);
    }
  } catch (error) {
    console.error("Error initializing model from localStorage:", error);
    // If there's an error, use the default model
    set({ selectedModel: AI_MODELS[0] });
  }
};

// Function to find the best alternative model if current one becomes unavailable
export const findAlternativeModelAction = (set: Function, get: StoreApi<ChatStore>['getState']) => () => {
  const currentModel = get().selectedModel;
  
  // If the current model still exists in our list, no need to change
  const modelStillExists = AI_MODELS.some(m => m.id === currentModel.id);
  if (modelStillExists) {
    return;
  }
  
  // Try to find a model from the same provider
  const sameProviderModel = AI_MODELS.find(m => m.provider === currentModel.provider);
  
  // If found, use this model
  if (sameProviderModel) {
    console.log(`Model ${currentModel.id} no longer available, switching to ${sameProviderModel.id} from same provider`);
    set({ selectedModel: sameProviderModel });
    return;
  }
  
  // If no model from the same provider, use the default
  console.log(`No replacement model found for ${currentModel.id}, using default`);
  set({ selectedModel: AI_MODELS[0] });
};
