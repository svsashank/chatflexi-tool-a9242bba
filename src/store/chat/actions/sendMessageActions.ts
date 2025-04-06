
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatStore } from '../types';
import { AIModel } from '@/types';

export const createSendMessageAction = (
  set: StateCreator<ChatStore>['setState'],
  get: () => ChatStore
) => {
  return (content: string, images: string[] = []) => {
    const { currentConversationId, conversations, selectedModel, generateResponse } = get();
    
    if (!currentConversationId) return;
    
    const userId = localStorage.getItem('userId') || undefined;
    
    const timestamp = new Date();
    const messageId = uuidv4();
    
    // Add user message
    set((state) => {
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: messageId,
                content,
                role: 'user',
                model: selectedModel, // Include selected model info
                timestamp,
                images // Include any attached images
              }
            ],
            updatedAt: timestamp
          };
        }
        return conv;
      });
      
      return {
        ...state,
        conversations: updatedConversations
      };
    });
    
    // Generate AI response
    generateResponse();
  };
};
