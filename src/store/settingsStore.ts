
import { create } from 'zustand';

interface ApiKeys {
  openai: string;
  anthropic: string;
  google: string;
  xai: string;
}

interface SettingsState {
  isOpen: boolean;
  apiKeys: ApiKeys;
  openSettings: () => void;
  closeSettings: () => void;
  updateApiKey: (provider: keyof ApiKeys | string, key: string) => void;
}

// Load API keys from localStorage if available
const loadApiKeys = (): ApiKeys => {
  const storedKeys = localStorage.getItem('chatflexi-api-keys');
  if (storedKeys) {
    try {
      return JSON.parse(storedKeys);
    } catch (e) {
      console.error('Failed to parse stored API keys', e);
    }
  }
  return {
    openai: '',
    anthropic: '',
    google: '',
    xai: '',
  };
};

export const useSettingsStore = create<SettingsState>((set) => ({
  isOpen: false,
  apiKeys: loadApiKeys(),
  
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),
  
  updateApiKey: (provider, key) => {
    set((state) => {
      const updatedKeys = {
        ...state.apiKeys,
        [provider]: key,
      };
      
      // Save to localStorage
      localStorage.setItem('chatflexi-api-keys', JSON.stringify(updatedKeys));
      
      return { apiKeys: updatedKeys };
    });
  },
}));
