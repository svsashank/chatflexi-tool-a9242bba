import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Simple singleton pattern for auth state to prevent duplicate initializations
const authState = {
  initialized: false,
  user: null as User | null,
  session: null as Session | null,
  subscription: null as any
};

export const useAuthInitialization = () => {
  const [user, setUser] = useState<User | null>(authState.user);
  const [session, setSession] = useState<Session | null>(authState.session);
  const [loading, setLoading] = useState(!authState.initialized);
  
  useEffect(() => {
    // First setup auth listener if not already done
    if (!authState.subscription) {
      console.log("Setting up auth state listener");
      
      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        console.log(`Auth state changed: ${event}`);
        
        // Update global singleton state
        authState.session = newSession;
        authState.user = newSession?.user ?? null;
        
        // Update component state
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });
      
      authState.subscription = data.subscription;
    }
    
    // Get current session state
    const initializeAuth = async () => {
      if (authState.initialized) {
        // Just sync with global state
        setUser(authState.user);
        setSession(authState.session);
        setLoading(false);
        return;
      }
      
      try {
        console.log("Initializing auth state");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        // Update global state
        authState.session = data.session;
        authState.user = data.session?.user ?? null;
        authState.initialized = true;
        
        // Update component state
        setUser(data.session?.user ?? null);
        setSession(data.session);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        authState.initialized = true; // Prevent loops
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Clean up function
    return () => {
      // Don't unsubscribe from auth listener - keep it for the app lifetime
    };
  }, []);

  return { user, session, loading };
};
