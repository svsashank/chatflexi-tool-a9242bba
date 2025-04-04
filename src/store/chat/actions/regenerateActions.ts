
import { toast } from '@/components/ui/use-toast';

export const createRegenerateMessageAction = (set: Function, get: Function) => 
  async () => {
    const currentConversationId = get().currentConversationId;
    
    if (!currentConversationId) {
      toast({
        title: 'Error',
        description: 'No active conversation found',
        variant: 'destructive',
      });
      return Promise.resolve();
    }
    
    set(state => {
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === currentConversationId) {
          const updatedMessages = conv.messages.slice(0, -1);
          return { ...conv, messages: updatedMessages };
        }
        return conv;
      });
      
      return { conversations: updatedConversations };
    });
    
    // After removing the last AI message, generate a new response
    const generateResponse = get().generateResponse;
    if (generateResponse) {
      await generateResponse();
    } else {
      console.error('generateResponse function is not available in the store');
    }
    
    return Promise.resolve();
  };
