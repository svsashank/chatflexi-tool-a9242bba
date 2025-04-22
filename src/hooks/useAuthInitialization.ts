
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Singleton for tracking global auth state
const globalAuthState = {
  initialized: false,
  currentUser: null as User | null,
  currentSession: null as Session | null,
  authListener: null as any
};

export const useAuthInitialization = () => {
  const [user, setUser] = useState<User | null>(globalAuthState.currentUser);
  const [session, setSession] = useState<Session | null>(globalAuthState.currentSession);
  const [loading, setLoading] = useState(!globalAuthState.initialized);
  
  // Use refs to track initialization and state changes across renders
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;
    
    const initializeAuth = async () => {
      // Skip if already initialized globally
      if (globalAuthState.initialized) {
        // Just sync with the global state
        setUser(globalAuthState.currentUser);
        setSession(globalAuthState.currentSession);
        setLoading(false);
        return;
      }
      
      try {
        console.log("Initializing auth state");
        
        // First set up the auth state listener if not already set
        if (!globalAuthState.authListener) {
          const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
            // Only log meaningful auth state changes, not every event
            if (event !== 'INITIAL_SESSION') {
              console.log(`Auth state changed: ${event}`);
            }
            
            // Update global state
            globalAuthState.currentSession = newSession;
            globalAuthState.currentUser = newSession?.user ?? null;
            
            // Update component state if mounted
            if (isMountedRef.current) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
            }
          });
          
          // Store the listener for cleanup
          globalAuthState.authListener = data.subscription;
        }
        
        // Then check for an existing session
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        // Update global state
        globalAuthState.currentSession = sessionData.session;
        globalAuthState.currentUser = sessionData.session?.user ?? null;
        globalAuthState.initialized = true;
        
        // Update component state if still mounted
        if (isMountedRef.current) {
          setUser(sessionData.session?.user ?? null);
          setSession(sessionData.session);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        
        // Reset state on error, but mark as initialized to prevent loops
        globalAuthState.initialized = true;
        
        // Update component state if still mounted
        if (isMountedRef.current) {
          setLoading(false);
          setUser(null);
          setSession(null);
        }
      }
    };
    
    initializeAuth();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - only run once per component instance

  return { user, session, loading };
};
