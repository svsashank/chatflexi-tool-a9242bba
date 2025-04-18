
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

// Global key to track auth callback processing
const AUTH_CALLBACK_PROCESSED_KEY = 'auth_callback_processed';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadConversationsFromDB, createConversation, clearConversations } = useChatStore();
  // Use a ref to track if the callback has been processed
  const callbackProcessedRef = useRef(false);

  useEffect(() => {
    // Skip if already processed in this component instance
    if (callbackProcessedRef.current) {
      console.log("Auth callback already processed by this component instance");
      return;
    }
    
    // Skip if already processed in this session
    if (sessionStorage.getItem(AUTH_CALLBACK_PROCESSED_KEY) === 'true') {
      console.log("Auth callback already processed in this session, redirecting to home");
      navigate('/', { replace: true });
      return;
    }
    
    // Mark as processed immediately to prevent race conditions
    callbackProcessedRef.current = true;
    sessionStorage.setItem(AUTH_CALLBACK_PROCESSED_KEY, 'true');
    
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
          console.log("Auth callback successful, loading conversations");
          // Navigate first to avoid multiple redirects - the ProtectedRoute will handle loading conversations
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
    
  }, [navigate, loadConversationsFromDB, createConversation, clearConversations]);

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
