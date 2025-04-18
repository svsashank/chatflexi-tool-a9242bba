
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadConversationsFromDB, createConversation, clearConversations } = useChatStore();
  // Use a ref to track if the callback has been processed
  const callbackProcessedRef = useRef(false);

  useEffect(() => {
    // Flag to prevent duplicate processing with a ref
    if (callbackProcessedRef.current) {
      console.log("Auth callback already processed by this component instance");
      return;
    }
    
    // Flag to prevent duplicate processing across renders
    const callbackProcessedKey = 'auth_callback_processed';
    if (sessionStorage.getItem(callbackProcessedKey) === 'true') {
      console.log("Auth callback already processed in this session, redirecting to home");
      navigate('/', { replace: true });
      return;
    }
    
    // Mark as processed immediately to prevent race conditions
    callbackProcessedRef.current = true;
    sessionStorage.setItem(callbackProcessedKey, 'true');
    
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        console.log("Processing auth callback");
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
          try {
            // First, reset the conversation state to clear any existing unauthenticated conversations
            clearConversations();
            
            // Then load user's conversations after successful authentication
            await loadConversationsFromDB();
            
            // Check current state after loading
            const currentConversations = useChatStore.getState().conversations;
            
            // Create a new conversation if none were loaded
            if (currentConversations.length === 0) {
              await createConversation();
            }
            
            navigate('/', { replace: true });
          } catch (err) {
            console.error('Error loading conversations:', err);
            // Still navigate to home even if conversation loading fails
            // The ProtectedRoute will try again
            navigate('/', { replace: true });
          }
        } else {
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
    
    // Clean up function
    return () => {
      // Nothing to clean up
    };
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
