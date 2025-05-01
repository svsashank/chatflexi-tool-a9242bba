
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import debounce from 'lodash/debounce';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Track conversation creation globally across hook instances
const globalCreationState = {
  isCreating: false,
  pendingRequest: null as AbortController | null,
  lastCreatedAt: 0, // Track timestamp of last creation
  creationsByUser: new Map<string, number>(), // Track creations per user
  inProgressById: new Set<string>(), // Track by component ID
  activeConversation: null as string | null, // Track the active conversation to prevent duplicates
  hasExistingConversations: false, // Track whether user already has conversations
};

export const useConversationCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const createRequestRef = useRef<AbortController | null>(null);
  const { createConversation, conversations } = useChatStore();
  const isMountedRef = useRef(true);
  const { user, isTokenRefresh } = useAuth();
  const componentIdRef = useRef(`cc_${Math.random().toString(36).substring(2, 10)}`);
  
  // Update the global state if we have conversations
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      globalCreationState.hasExistingConversations = true;
      
      // If we have an existing conversation, store the most recent one as active
      if (conversations[0]?.id && !globalCreationState.activeConversation) {
        globalCreationState.activeConversation = conversations[0].id;
        console.log(`Setting active conversation to existing one: ${conversations[0].id}`);
      }
    }
  }, [conversations]);
  
  useEffect(() => {
    console.log(`Conversation creator mounted: ${componentIdRef.current}`);
    return () => {
      console.log(`Conversation creator unmounting: ${componentIdRef.current}`);
      isMountedRef.current = false;
      
      // Cleanup this component's in-progress marker
      globalCreationState.inProgressById.delete(componentIdRef.current);
      
      if (createRequestRef.current) {
        createRequestRef.current.abort();
        createRequestRef.current = null;
      }
    };
  }, []);

  // Create a debounced version of conversation creation
  const debouncedCreate = useRef(
    debounce(async () => {
      // Skip if this component already has a creation in progress
      if (globalCreationState.inProgressById.has(componentIdRef.current)) {
        console.log(`Creation already in progress for component ${componentIdRef.current}, skipping`);
        return globalCreationState.activeConversation;
      }
      
      try {
        // Mark this component as creating
        globalCreationState.inProgressById.add(componentIdRef.current);
        
        // Skip creation on token refresh events
        if (isTokenRefresh) {
          console.log("Skipping conversation creation during token refresh");
          return globalCreationState.activeConversation;
        }
        
        // Check if user exists
        if (!user) {
          console.log("No authenticated user, skipping conversation creation");
          return null;
        }
        
        // If the user already has conversations, don't create a new one automatically
        if (globalCreationState.hasExistingConversations && conversations.length > 0) {
          console.log("User already has conversations, skipping automatic creation");
          // Return the ID of the first conversation if it exists
          if (conversations[0]?.id) {
            globalCreationState.activeConversation = conversations[0].id;
            return conversations[0].id;
          }
        }
        
        // Check global creation state first
        if (globalCreationState.isCreating) {
          console.log("Conversation creation already in progress globally");
          return globalCreationState.activeConversation;
        }
        
        // Check if we already have an active conversation - don't create duplicates
        if (globalCreationState.activeConversation) {
          console.log(`Active conversation already exists: ${globalCreationState.activeConversation}, using that instead`);
          return globalCreationState.activeConversation;
        }
        
        // Prevent rapid successive creations (rate limiting)
        const now = Date.now();
        if ((now - globalCreationState.lastCreatedAt) < 5000) { // 5 seconds cooldown (increased from 3)
          console.log("Creation attempted too soon after previous creation, skipping");
          return globalCreationState.activeConversation;
        }
        
        // Rate limit per user (max 2 conversations per minute - reduced from 3)
        const userCreationCount = globalCreationState.creationsByUser.get(user.id) || 0;
        if (userCreationCount >= 2) {
          console.log("User has created too many conversations recently, skipping");
          toast.warning("Please wait before creating more conversations");
          return globalCreationState.activeConversation;
        }
        
        // Set both local and global creation state
        if (isMountedRef.current) {
          setIsCreating(true);
        }
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
        
        console.log(`Starting conversation creation from component ${componentIdRef.current}...`);
        const newId = await createConversation();
        
        if (!newId) {
          throw new Error('Failed to create conversation');
        }
        
        // Set as active conversation
        globalCreationState.activeConversation = newId;
        
        // Update creation tracking
        globalCreationState.lastCreatedAt = Date.now();
        globalCreationState.hasExistingConversations = true;
        
        // Track per-user creation count
        const currentCount = globalCreationState.creationsByUser.get(user.id) || 0;
        globalCreationState.creationsByUser.set(user.id, currentCount + 1);
        
        // Reset user count after 1 minute
        setTimeout(() => {
          if (user && globalCreationState.creationsByUser.has(user.id)) {
            const count = globalCreationState.creationsByUser.get(user.id) || 0;
            if (count > 0) {
              globalCreationState.creationsByUser.set(user.id, count - 1);
            }
          }
        }, 60000);
        
        console.log("Conversation creation completed successfully:", newId);
        return newId;
      } catch (error: any) {
        // Only show error if not aborted and component is still mounted
        if (error.name !== 'AbortError' && isMountedRef.current) {
          console.error('Error in conversation creation:', error);
          toast.error('Could not create a new conversation');
        } else {
          console.log('Conversation creation aborted or component unmounted');
        }
        return null;
      } finally {
        // Reset states if component is still mounted
        if (isMountedRef.current) {
          setIsCreating(false);
        }
        
        // Always reset global state
        globalCreationState.isCreating = false;
        
        // Clear component's in-progress marker
        globalCreationState.inProgressById.delete(componentIdRef.current);
        
        // Clear references
        createRequestRef.current = null;
        globalCreationState.pendingRequest = null;
      }
    }, 600, { leading: true, trailing: false })
  ).current;

  // Method to clear the active conversation (call when switching conversations)
  const clearActiveConversation = () => {
    globalCreationState.activeConversation = null;
  };

  return {
    isCreating: isCreating || globalCreationState.isCreating,
    createConversation: debouncedCreate,
    clearActiveConversation
  };
};
