
import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

// Flag to track if we've attempted to load conversations in this browser session
const CONVERSATIONS_LOADED_KEY = 'conversations_loaded_session';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  const initAttemptedRef = useRef(false);
  
  useEffect(() => {
    // Skip if already attempted in this component instance or user is not authenticated
    if (initAttemptedRef.current || !user || loading) {
      return;
    }
    
    // Mark as attempted in this component instance
    initAttemptedRef.current = true;
    
    const initConversations = async () => {
      try {
        console.log("ProtectedRoute: Initializing conversations for authenticated user");
        
        // Only load conversations if we don't already have them
        if (conversations.length === 0) {
          console.log("No conversations in state, loading from database");
          await loadConversationsFromDB();
          
          // Get fresh state after loading
          const currentConversations = useChatStore.getState().conversations;
          
          // Only create a new conversation if none were loaded
          if (currentConversations.length === 0) {
            console.log("No conversations found, creating a new one");
            await createConversation();
          }
          
          // Mark as loaded in this browser session
          localStorage.setItem(CONVERSATIONS_LOADED_KEY, 'true');
        } else {
          console.log(`Already have ${conversations.length} conversations in state, not reloading`);
        }
      } catch (error) {
        console.error("Error initializing conversations:", error);
        toast({
          title: 'Error',
          description: 'Could not load your conversations',
          variant: 'destructive',
        });
      }
    };
    
    // Check if we've already loaded conversations in this browser session
    const alreadyLoaded = localStorage.getItem(CONVERSATIONS_LOADED_KEY);
    if (alreadyLoaded !== 'true') {
      // Execute conversation initialization if not already loaded
      initConversations();
    } else {
      console.log("ProtectedRoute: Conversations already loaded in this browser session");
    }
    
  }, [user, loading, loadConversationsFromDB, createConversation, conversations]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
