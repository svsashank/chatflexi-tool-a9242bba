
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  // Use a ref to track if the callback has been processed
  const callbackProcessedRef = useRef(false);

  useEffect(() => {
    // Skip if already processed in this component instance
    if (callbackProcessedRef.current) {
      console.log("Auth callback already processed by this component instance");
      return;
    }
    
    // Mark as processed immediately to prevent race conditions
    callbackProcessedRef.current = true;
    
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        console.log("Processing auth callback");
        
        // Use getSession to check if authentication was successful
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error);
          toast({
            title: 'Authentication Error',
            description: error.message,
            variant: 'destructive',
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        if (data.session) {
          console.log("Auth callback successful, navigating to home");
          
          // Navigate to the home page - conversation loading will be handled by the ProtectedRoute
          navigate('/', { replace: true });
        } else {
          console.log("No session found after auth callback");
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred during authentication',
          variant: 'destructive',
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
    
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <h2 className="text-xl font-medium">Completing authentication...</h2>
      </div>
    </div>
  );
};

export default AuthCallback;
