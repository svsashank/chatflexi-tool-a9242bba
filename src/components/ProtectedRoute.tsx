
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/store';
import { toast } from 'sonner';

// Global flag to track initialization across route changes
const initializedUsers = new Set<string>();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadConversationsFromDB, createConversation, conversations } = useChatStore();
  const initAttemptedRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  useEffect(() => {
    // Skip if already attempted in this component instance or user is not authenticated or still loading
    if (initAttemptedRef.current || !user || loading) {
      return;
    }
    
    // Mark as attempted in this component instance
    initAttemptedRef.current = true;
    
    const initConversations = async () => {
      try {
        // Check if we've already initialized this user in the current session
        if (initializedUsers.has(user.id)) {
          console.log(`ProtectedRoute: User ${user.id} already initialized`);
          return;
        }
        
        setIsInitializing(true);
        console.log("ProtectedRoute: Initializing conversations for authenticated user");
        
        // Load conversations if we don't already have them
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
          
          // Mark as initialized for this user
          initializedUsers.add(user.id);
        } else {
          console.log(`Already have ${conversations.length} conversations in state, not reloading`);
          // Still mark as initialized
          initializedUsers.add(user.id);
        }
      } catch (error) {
        console.error("Error initializing conversations:", error);
        toast.error('Could not load your conversations. Please try refreshing the page.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initConversations();
    
  }, [user, loading, loadConversationsFromDB, createConversation, conversations]);

  // Show loading state while auth is being resolved
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show initializing state while conversations are being loaded
  if (user && isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading your conversations...</p>
      </div>
    );
  }

  // Redirect to auth if no user
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render children when authenticated and initialization is complete
  return <>{children}</>;
};

export default ProtectedRoute;
