
import { useEffect, useState } from 'react';
import { useChatStore } from '@/store';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { loadConversationsFromDB, conversations, currentConversationId } = useChatStore();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if we need to load conversations
        if (!user) {
          return;
        }
        
        if (conversations.length === 0) {
          console.log("Loading conversations from database");
          setIsInitializing(true);
          await loadConversationsFromDB();
          setIsInitializing(false);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing data:", error);
        toast.error("Failed to load your conversations");
        setIsInitializing(false);
        setIsInitialized(true); // Mark as initialized anyway to prevent loading loop
      }
    };
    
    if (!isInitialized && !isInitializing && !authLoading) {
      initializeData();
    }
  }, [conversations.length, loadConversationsFromDB, isInitialized, isInitializing, authLoading, user]);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while initializing
  if (isInitializing || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading your conversations...</p>
      </div>
    );
  }

  // Render children when authenticated and initialization is done
  return <>{children}</>;
};

export default ProtectedRoute;
