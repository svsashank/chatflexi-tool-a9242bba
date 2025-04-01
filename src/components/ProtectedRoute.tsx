
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useChatStore from '@/store/chatStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loadUserConversations, createConversation } = useChatStore();

  useEffect(() => {
    if (user && !loading) {
      // Load user's conversations when authenticated
      const initConversations = async () => {
        await loadUserConversations();
        // Create a new conversation after loading existing ones
        await createConversation();
      };
      
      initConversations();
    }
  }, [user, loading, loadUserConversations, createConversation]);

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
