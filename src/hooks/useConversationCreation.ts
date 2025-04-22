
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import debounce from 'lodash/debounce';
import { toast } from 'sonner';

// Track conversation creation globally across hook instances
const globalCreationState = {
  isCreating: false,
  pendingRequest: null as AbortController | null,
};

export const useConversationCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const createRequestRef = useRef<AbortController | null>(null);
  const { createConversation } = useChatStore();
  const isMountedRef = useRef(true);

  // Create a debounced version of conversation creation
  const debouncedCreate = useRef(
    debounce(async () => {
      try {
        // Check global creation state first
        if (globalCreationState.isCreating) {
          console.log("Conversation creation already in progress globally");
          return;
        }
        
        // Set both local and global creation state
        setIsCreating(true);
        globalCreationState.isCreating = true;
        
        // Cancel any previous ongoing request
        if (createRequestRef.current) {
          createRequestRef.current.abort();
        }
        if (globalCreationState.pendingRequest) {
          globalCreationState.pendingRequest.abort();
        }
        
        // Create a new abort controller for this request
        createRequestRef.current = new AbortController();
        globalCreationState.pendingRequest = createRequestRef.current;
        
        console.log("Starting debounced conversation creation...");
        const newId = await createConversation();
        
        if (!newId) {
          throw new Error('Failed to create conversation');
        }
        
        console.log("Debounced conversation creation completed successfully:", newId);
      } catch (error) {
        // Only show error if not aborted and component is still mounted
        if (error.name !== 'AbortError' && isMountedRef.current) {
          console.error('Error in conversation creation:', error);
          toast.error('Could not create a new conversation');
        } else {
          console.log('Conversation creation aborted or component unmounted');
        }
      } finally {
        // Reset states if component is still mounted
        if (isMountedRef.current) {
          setIsCreating(false);
        }
        
        // Always reset global state
        globalCreationState.isCreating = false;
        
        // Clear references
        createRequestRef.current = null;
        globalCreationState.pendingRequest = null;
      }
    }, 1000, { leading: true, trailing: false })
  ).current;

  // Track component mount state
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      debouncedCreate.cancel();
      
      // Cancel any active request when unmounting
      if (createRequestRef.current) {
        createRequestRef.current.abort();
        createRequestRef.current = null;
      }
    };
  }, [debouncedCreate]);

  return {
    isCreating: isCreating || globalCreationState.isCreating,
    createConversation: debouncedCreate
  };
};
