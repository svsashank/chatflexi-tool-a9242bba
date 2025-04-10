import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();

  useEffect(() => {
    if (user && !loading) {
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
            } else {
              console.log(`Loaded ${conversations.length} conversations, not reloading`);
            }
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
