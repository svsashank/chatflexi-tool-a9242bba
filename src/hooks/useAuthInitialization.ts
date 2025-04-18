
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Use a consistent key across components
const AUTH_INITIALIZED_KEY = 'auth_listener_initialized';

export const useAuthInitialization = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Use a ref to track initialization across renders
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    // Skip if already initialized in this component instance
    if (isInitializedRef.current) {
      return;
    }
    
    // Mark as initialized in this component instance
    isInitializedRef.current = true;
    
    let cleanup: (() => void) | undefined;
    
    const initializeAuth = async () => {
      try {
        // First set up the auth state listener
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          console.log(`Auth state changed: ${event}`);
          setSession(newSession);
          setUser(newSession?.user ?? null);
        });
        
        // Then check for an existing session
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        setUser(sessionData.session?.user ?? null);
        
        // Store cleanup function
        cleanup = data.subscription.unsubscribe;
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        // Always set loading to false regardless of outcome
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Return cleanup function to unsubscribe when component unmounts
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Empty dependency array - only run once

  return { user, session, loading };
};
