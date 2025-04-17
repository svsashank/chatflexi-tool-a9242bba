
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initConversations = async () => {
      if (user && !isInitialized) {
        console.log("ProtectedRoute: Initializing conversations for authenticated user");
        try {
          // Load existing conversations first
          await loadConversationsFromDB();
          
          // Create a new conversation only if none were loaded
          if (conversations.length === 0) {
            console.log("No conversations found, creating a new one");
            await createConversation();
          } else {
            console.log(`Loaded ${conversations.length} conversations`);
          }
          
          setIsInitialized(true);
        } catch (error) {
          console.error("Error initializing conversations:", error);
          toast({
            title: 'Error',
            description: 'Could not load your conversations',
            variant: 'destructive',
          });
        }
      }
    };
    
    initConversations();
  }, [user, loading, loadConversationsFromDB, createConversation, conversations.length, isInitialized]);

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
