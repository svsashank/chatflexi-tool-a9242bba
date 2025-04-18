
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

// Flag to track if we've attempted to load conversations in this session
const CONVERSATIONS_LOADED_KEY = 'conversations_loaded_protected_route';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  
  useEffect(() => {
    // Flag to prevent multiple operations in a single effect cycle
    let isOperationInProgress = false;
    
    const initConversations = async () => {
      // Early return if an operation is already in progress
      if (isOperationInProgress) return;
      isOperationInProgress = true;
      
      try {
        if (user && !loading) {
          // Check if we've already loaded conversations in this session
          const alreadyLoaded = sessionStorage.getItem(CONVERSATIONS_LOADED_KEY);
          
          if (alreadyLoaded === 'true') {
            console.log("ProtectedRoute: Conversations already loaded in this session");
            return;
          }
          
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
          } else {
            console.log(`Already have ${conversations.length} conversations in state, not reloading`);
          }
          
          // Mark as loaded in this session
          sessionStorage.setItem(CONVERSATIONS_LOADED_KEY, 'true');
        } else if (!loading && !user) {
          // Clear the loaded flag when user is not authenticated
          sessionStorage.removeItem(CONVERSATIONS_LOADED_KEY);
        }
      } catch (error) {
        console.error("Error initializing conversations:", error);
        toast({
          title: 'Error',
          description: 'Could not load your conversations',
          variant: 'destructive',
        });
      } finally {
        // Reset the operation flag when done
        isOperationInProgress = false;
      }
    };
    
    // Only run the initialization when auth state is settled (not loading)
    // AND user is authenticated (prevent unnecessary calls when not logged in)
    if (!loading && user) {
      initConversations();
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
