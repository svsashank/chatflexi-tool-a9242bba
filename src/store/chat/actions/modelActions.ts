
import { ChatStore } from '../types';

export const selectModelAction = (set: Function) => (model: any) => {
  console.log("Selecting model:", {
    id: model.id,
    name: model.name,
    provider: model.provider
  });
  set({ selectedModel: model });
};
