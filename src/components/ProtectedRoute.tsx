
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from 'sonner';

// Global state tracking across route changes and component instances
const globalState = {
  initializedUsers: new Set<string>(),
  initializationInProgress: new Set<string>(),
  initializationPromises: new Map<string, Promise<void>>(),
  lastSignInTime: new Map<string, number>(), // Track last sign-in time per user
  loadingAttempts: new Map<string, number>() // Track repeated loading attempts
};

const MAX_LOADING_ATTEMPTS = 3; // Maximum attempts before backing off
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isTokenRefresh } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  const [isInitializing, setIsInitializing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const componentIdRef = useRef(`pr_${Math.random().toString(36).substring(2, 10)}`);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    console.log(`ProtectedRoute mounted: ${componentIdRef.current}`);
    
    // Create abort controller for this component instance
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // If user is not authenticated, skip initialization
    if (!user) {
      console.log("ProtectedRoute: User is not authenticated, skipping initialization");
      return;
    }
    
    // Skip if already attempted in this component instance
    if (initAttemptedRef.current) {
      console.log(`ProtectedRoute ${componentIdRef.current}: Already attempted initialization, skipping`);
      return;
    }
    
    // Mark as attempted in this component instance
    initAttemptedRef.current = true;
    
    const initConversations = async () => {
      // Return early if aborted
      if (signal.aborted) {
        console.log(`ProtectedRoute ${componentIdRef.current}: Operation aborted`);
        return;
      }
      
      try {
        // Skip initialization if this is just a token refresh event
        if (isTokenRefresh) {
          console.log(`ProtectedRoute: Skipping initialization for user ${user.id} - token refresh only`);
          return;
        }
        
        // Check if initialization is in progress for this user
        if (globalState.initializationInProgress.has(user.id)) {
          console.log(`ProtectedRoute: Initialization already in progress for user ${user.id}`);
          return;
        }
        
        // Create a promise for this initialization that other components can wait on
        const initPromise = (async () => {
          // Mark initialization as in progress
          globalState.initializationInProgress.add(user.id);
          
          // Only show loading UI if this is going to be a longer operation
          if (conversations.length === 0) {
            setIsInitializing(true);
          }
          
          console.log(`ProtectedRoute ${componentIdRef.current}: Initializing conversations for authenticated user`);
          
          // Return early if aborted
          if (signal.aborted) return;
          
          // Check if we already have conversations in state first
          if (conversations.length === 0) {
            console.log("No conversations in state, loading from database");
            await loadConversationsFromDB();
            
            // Return early if aborted
            if (signal.aborted) return;
            
            // Check if we now have conversations after loading
            const currentConversations = useChatStore.getState().conversations;
            
            // Only create a new conversation if none were loaded and not aborted
            if (currentConversations.length === 0 && !signal.aborted) {
              console.log("No conversations found, creating a new one");
              try {
                await createConversation();
              } catch (e) {
                console.error("Failed to create conversation:", e);
                // Don't throw - just log the error and continue
              }
            } else {
              console.log(`Loaded ${currentConversations.length} conversations, no need to create a new one`);
            }
          } else {
            console.log(`Already have ${conversations.length} conversations in state, not reloading`);
          }
          
          // Mark as initialized only if not aborted
          if (!signal.aborted) {
            globalState.initializedUsers.add(user.id);
            // Reset loading attempts on successful completion
            globalState.loadingAttempts.set(user.id, 0);
          }
        })();
        
        // Store the promise
        globalState.initializationPromises.set(user.id, initPromise);
        
        // Wait for initialization to complete
        await initPromise;
      } catch (error) {
        // Only show error if not aborted
        if (!signal.aborted) {
          console.error("Error initializing conversations:", error);
          toast.error('Could not load your conversations. Please try refreshing the page.');
        }
      } finally {
        // Clean up regardless of success or failure, but only if not aborted
        if (!signal.aborted) {
          setIsInitializing(false);
          // Remove from in-progress set
          globalState.initializationInProgress.delete(user.id);
          // Remove the stored promise
          globalState.initializationPromises.delete(user.id);
        }
      }
    };
    
    // Start initialization
    initConversations();
    
    // Cleanup function
    return () => {
      console.log(`ProtectedRoute unmounting: ${componentIdRef.current}`);
      
      // Abort any ongoing operations for this component instance
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [user, loading, loadConversationsFromDB, createConversation, conversations, isTokenRefresh]);

  // Redirect to auth if no user and not loading
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show initializing state while conversations are being loaded
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading your conversations...</p>
      </div>
    );
  }

  // Render children when authenticated and initialization is complete
  return <>{children}</>;
};

export default ProtectedRoute;
