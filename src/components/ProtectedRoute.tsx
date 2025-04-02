
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Add detailed debugging
  useEffect(() => {
    console.log("ProtectedRoute - Auth state:", { 
      user: user ? `User ID: ${user.id.substring(0, 8)}...` : 'No user', 
      loading 
    });
  }, [user, loading]);

  if (loading) {
    console.log("ProtectedRoute - Still loading auth state, showing loading indicator");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute - No authenticated user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  console.log("ProtectedRoute - User authenticated, rendering protected content");
  return <>{children}</>;
};

export default ProtectedRoute;
