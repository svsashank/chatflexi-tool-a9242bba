
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import debounce from 'lodash/debounce';
import { toast } from 'sonner';

export const useConversationCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const createRequestRef = useRef<AbortController | null>(null);
  const { createConversation } = useChatStore();

  // Create a debounced version of conversation creation
  const debouncedCreate = useRef(
    debounce(async () => {
      try {
        setIsCreating(true);
        const newId = await createConversation();
        if (!newId) {
          throw new Error('Failed to create conversation');
        }
      } catch (error) {
        console.error('Error in conversation creation:', error);
        toast.error('Could not create a new conversation');
      } finally {
        setIsCreating(false);
      }
    }, 1000, { leading: true, trailing: false })
  ).current;

  // Cleanup function
  useEffect(() => {
    return () => {
      debouncedCreate.cancel();
      if (createRequestRef.current) {
        createRequestRef.current.abort();
      }
    };
  }, [debouncedCreate]);

  return {
    isCreating,
    createConversation: debouncedCreate
  };
};
