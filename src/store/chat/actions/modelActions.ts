
import { AI_MODELS } from "@/constants";
import { AIModel, ChatStore } from "../types";
import { StoreApi } from "zustand";

export const selectModelAction = (set: Function) => (model: AIModel) => {
  // Save selected model in localStorage
  try {
    localStorage.setItem('selectedModel', JSON.stringify(model));
  } catch (error) {
    console.error("Error saving model to localStorage:", error);
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
      
      // Validate that the parsed model matches one of our AI_MODELS
      const foundModel = AI_MODELS.find(m => m.id === model.id);
      
      if (foundModel) {
        // Set the found model in the store
        set({ selectedModel: foundModel });
      } else {
        // If model not found in our list, use the default
        set({ selectedModel: AI_MODELS[0] });
        console.log("Saved model not found in AI_MODELS, using default");
      }
    }
  } catch (error) {
    console.error("Error initializing model from localStorage:", error);
    // If there's an error, use the default model
    set({ selectedModel: AI_MODELS[0] });
  }
};
