
import { ChatStore } from '../types';
import { AIModel } from '@/types';

export const selectModelAction = (set: Function) => (model: AIModel) => {
  console.log("Selecting model:", {
    id: model.id,
    name: model.name,
    provider: model.provider,
    capabilities: model.capabilities
  });
  
  // Update the selected model in the store
  set({ selectedModel: model });
  
  // Save the selected model to localStorage for persistence across sessions
  try {
    localStorage.setItem('selectedModel', JSON.stringify({
      id: model.id,
      name: model.name,
      provider: model.provider
    }));
  } catch (error) {
    console.error("Error saving selected model to localStorage:", error);
  }
};

// Function to initialize the selected model from localStorage
export const initializeModelAction = (set: Function, get: Function) => () => {
  try {
    const savedModel = localStorage.getItem('selectedModel');
    
    if (savedModel) {
      const parsedModel = JSON.parse(savedModel);
      console.log("Initializing from saved model:", parsedModel);
      
      // Find the matching model from the available models
      const { AI_MODELS } = require('@/constants');
      const matchedModel = AI_MODELS.find((m: AIModel) => m.id === parsedModel.id);
      
      if (matchedModel) {
        console.log("Found matching model:", matchedModel.name);
        set({ selectedModel: matchedModel });
        return;
      }
    }
    
    // If no saved model or no match, use the current selected model
    console.log("Using default model:", get().selectedModel.name);
  } catch (error) {
    console.error("Error initializing model from localStorage:", error);
  }
};
