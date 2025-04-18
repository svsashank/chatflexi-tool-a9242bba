
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

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
        // Set loading state
        setLoading(true);
        
        console.log("Initializing auth state");
        
        // First set up the auth state listener
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          // Only log meaningful auth state changes, not every event
          if (event !== 'INITIAL_SESSION') {
            console.log(`Auth state changed: ${event}`);
          }
          
          // Update state with the new session
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Complete loading once we have a definitive auth state
          if (event !== 'INITIAL_SESSION') {
            setLoading(false);
          }
        });
        
        // Then check for an existing session
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Only set session if we got data back
        if (sessionData) {
          setSession(sessionData.session);
          setUser(sessionData.session?.user ?? null);
        }
        
        // Store cleanup function
        cleanup = data.subscription.unsubscribe;
        
        // Complete loading after initial check
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Return cleanup function to unsubscribe when component unmounts
    return () => {
      if (cleanup) {
        console.log("Cleaning up auth listener");
        cleanup();
      }
    };
  }, []); // Empty dependency array - only run once

  return { user, session, loading };
};
