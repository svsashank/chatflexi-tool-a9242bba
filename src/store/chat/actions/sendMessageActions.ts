
import { v4 as uuidv4 } from 'uuid';
import { ChatStore } from '../types';
import { AIModel } from '@/types';
import { toast } from 'sonner';

export const createSendMessageAction = (
  set: (state: Partial<ChatStore>) => void,
  get: () => ChatStore
) => {
  return (content: string, images: string[] = [], files: string[] = []) => {
    const { currentConversationId, conversations, selectedModel, generateResponse } = get();
    
    if (!currentConversationId) {
      toast.error("No active conversation found");
      return;
    }
    
    const userId = localStorage.getItem('userId') || undefined;
    
    const timestamp = new Date();
    const messageId = uuidv4();
    
    // Add user message
    set({
      conversations: conversations.map((conv) => {
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
                images, // Include any attached images
                files   // Include any attached files (including extracted PDF text)
              }
            ],
            updatedAt: timestamp
          };
        }
        return conv;
      })
    });
    
    // Add a slight delay before generating the AI response to improve UX
    setTimeout(() => {
      // Generate AI response
      generateResponse();
    }, 100);
  };
};
