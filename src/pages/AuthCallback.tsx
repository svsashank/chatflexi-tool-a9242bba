
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import useChatStore from '@/store/chatStore';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadUserConversations } = useChatStore();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during auth callback:', error);
        navigate('/auth', { replace: true });
        return;
      }
      
      if (data.session) {
        // Load user's conversations after successful authentication
        await loadUserConversations();
        navigate('/', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, loadUserConversations]);

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
