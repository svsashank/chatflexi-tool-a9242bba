
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
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isTokenRefresh } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  const initAttemptedRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    // Create abort controller for this component instance
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    // If user is not authenticated or still loading, skip initialization
    if (!user || loading) {
      return;
    }
    
    // Skip if already attempted in this component instance
    if (initAttemptedRef.current) {
      return;
    }
    
    // Mark as attempted in this component instance
    initAttemptedRef.current = true;
    
    const initConversations = async () => {
      // Return early if aborted
      if (signal.aborted) return;
      
      try {
        // Skip initialization if this is just a token refresh event
        if (isTokenRefresh) {
          console.log(`ProtectedRoute: Skipping initialization for user ${user.id} - token refresh only`);
          return;
        }
        
        // Check if initialization is in progress for this user
        if (globalState.initializationInProgress.has(user.id)) {
          console.log(`ProtectedRoute: Initialization already in progress for user ${user.id}`);
          
          // Wait for the existing initialization to complete
          if (globalState.initializationPromises.has(user.id)) {
            await globalState.initializationPromises.get(user.id);
            console.log(`ProtectedRoute: Waited for existing initialization for user ${user.id}`);
            return;
          }
          return;
        }
        
        // Prevent repeated initializations in quick succession
        const now = Date.now();
        const lastInit = globalState.lastSignInTime.get(user.id) || 0;
        if ((now - lastInit) < 5000) { // Within 5 seconds (reduced from 10s)
          console.log(`ProtectedRoute: User ${user.id} was initialized recently, skipping`);
          return;
        }
        
        // Update last sign-in time
        globalState.lastSignInTime.set(user.id, now);
        
        // Create a promise for this initialization that other components can wait on
        const initPromise = (async () => {
          // Mark initialization as in progress
          globalState.initializationInProgress.add(user.id);
          
          setIsInitializing(true);
          console.log("ProtectedRoute: Initializing conversations for authenticated user");
          
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
              await createConversation();
            } else {
              console.log(`Loaded ${currentConversations.length} conversations, no need to create a new one`);
            }
          } else {
            console.log(`Already have ${conversations.length} conversations in state, not reloading`);
          }
          
          // Mark as initialized only if not aborted
          if (!signal.aborted) {
            globalState.initializedUsers.add(user.id);
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
      // Abort any ongoing operations for this component instance
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // If component unmounts during initialization, cleanup only the request state
      // but leave the global tracking intact for other instances
      if (user && globalState.initializationInProgress.has(user.id)) {
        console.log(`Component unmounted during initialization for user ${user.id}`);
        // We don't remove from initializationInProgress here to prevent new instances from starting
        // a parallel initialization; it will be removed when the promise completes or fails
      }
    };
  }, [user, loading, loadConversationsFromDB, createConversation, conversations, isTokenRefresh]);

  // Show loading state while auth is being resolved
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if no user
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
