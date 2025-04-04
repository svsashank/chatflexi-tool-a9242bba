
import { ChatState } from '../types';

export const selectModelAction = (set: Function) => (model: any) => {
  set({ selectedModel: model });
};
