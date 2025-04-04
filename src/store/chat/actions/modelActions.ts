
import { ChatState } from '../types';

export const selectModelAction = (set: Function) => (model: any) => {
  console.log("Selecting model:", model);
  set({ selectedModel: model });
};
