
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

const AUTH_INITIALIZED_KEY = 'auth_listener_initialized';

export const useAuthInitialization = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    // Prevent multiple initializations
    if (sessionStorage.getItem(AUTH_INITIALIZED_KEY) === 'true') {
      console.log('Auth already initialized, skipping');
      return;
    }

    try {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          // Only update if session has actually changed
          if (JSON.stringify(session) !== JSON.stringify(newSession)) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
          }
        }
      );

      // Check for existing session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      // Update state only if session exists and is different
      if (initialSession && JSON.stringify(session) !== JSON.stringify(initialSession)) {
        setSession(initialSession);
        setUser(initialSession.user);
      }

      // Mark as initialized
      sessionStorage.setItem(AUTH_INITIALIZED_KEY, 'true');
      
      setLoading(false);

      // Return unsubscribe function
      return () => {
        subscription.unsubscribe();
        sessionStorage.removeItem(AUTH_INITIALIZED_KEY);
      };

    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanup = initializeAuth();
    return () => {
      cleanup.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [initializeAuth]);

  return { user, session, loading };
};
