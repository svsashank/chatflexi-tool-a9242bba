
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/store';
import { toast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadConversationsFromDB, createConversation, clearConversations } = useChatStore();

  useEffect(() => {
    // Handle the OAuth callback once
    const processCallbackOnce = () => {
      // Flag to prevent duplicate processing
      const callbackProcessedKey = 'auth_callback_processed';
      if (sessionStorage.getItem(callbackProcessedKey) === 'true') {
        console.log("Auth callback already processed, redirecting to home");
        navigate('/', { replace: true });
        return;
      }
      
      // Mark as processed immediately to prevent race conditions
      sessionStorage.setItem(callbackProcessedKey, 'true');
      
      // Handle the actual auth callback
      handleAuthCallback();
    };
    
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
            
            // Create a new conversation if none were loaded
            if (useChatStore.getState().conversations.length === 0) {
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

    processCallbackOnce();
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
