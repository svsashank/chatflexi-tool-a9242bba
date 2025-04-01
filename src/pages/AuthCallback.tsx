
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import useChatStore from '@/store/chatStore';
import { toast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadUserConversations, createConversation } = useChatStore();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
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
          // Load user's conversations after successful authentication
          await loadUserConversations();
          // Create a new conversation after loading existing ones
          await createConversation();
          navigate('/', { replace: true });
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
  }, [navigate, loadUserConversations, createConversation]);

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
