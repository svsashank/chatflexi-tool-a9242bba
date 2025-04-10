
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
    
    // For debugging: Log what's being sent to the model
    console.log('Sending message to model:', {
      content,
      imagesCount: images.length,
      filesCount: files.length,
      filesPreview: files.length > 0 ? files.map(f => f.substring(0, 100) + '...') : []
    });
    
    // Add user message
    set({
      conversations: conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          // Debug logging to ensure files are being properly added
          if (files && files.length > 0) {
            console.log(`Adding ${files.length} files to message ${messageId}`);
            console.log(`First file content starts with: ${files[0].substring(0, 150)}...`);
          }
          
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
