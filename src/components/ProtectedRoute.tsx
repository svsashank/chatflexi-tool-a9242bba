
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
    if (user && !loading) {
      // Check if we've already loaded conversations in this session
      const alreadyLoaded = sessionStorage.getItem(conversationsLoadedKey);
      
      if (alreadyLoaded === 'true') {
        console.log("ProtectedRoute: Conversations already loaded in this session");
        return;
      }
      
      // Load user's conversations when authenticated
      const initConversations = async () => {
        console.log("ProtectedRoute: Initializing conversations for authenticated user");
        try {
          // Only load conversations if we don't already have them
          if (conversations.length === 0) {
            console.log("No conversations in state, loading from database");
            await loadConversationsFromDB();
            
            // Only create a new conversation if none were loaded
            if (conversations.length === 0) {
              console.log("No conversations found, creating a new one");
              await createConversation();
            }
          } else {
            console.log(`Already have ${conversations.length} conversations in state, not reloading`);
          }
          
          // Mark as loaded in this session
          sessionStorage.setItem(conversationsLoadedKey, 'true');
        } catch (error) {
          console.error("Error initializing conversations:", error);
          toast({
            title: 'Error',
            description: 'Could not load your conversations',
            variant: 'destructive',
          });
        }
      };
      
      initConversations();
    } else if (!loading && !user) {
      // Clear the loaded flag when user is not authenticated
      sessionStorage.removeItem(conversationsLoadedKey);
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
