
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();

  // Use sessionStorage to track if conversations have been loaded
  const conversationsLoadedKey = 'conversations_loaded_protected_route';
  
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
          const alreadyLoaded = sessionStorage.getItem(conversationsLoadedKey);
          
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
          sessionStorage.setItem(conversationsLoadedKey, 'true');
        } else if (!loading && !user) {
          // Clear the loaded flag when user is not authenticated
          sessionStorage.removeItem(conversationsLoadedKey);
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
    if (!loading) {
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
