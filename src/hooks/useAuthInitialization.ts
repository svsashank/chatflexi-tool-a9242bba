
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

const globalInitState = {
  initialized: false,
  authSessions: new Map<string, number>() // Track auth sessions by user ID and timestamp
};

export const useAuthInitialization = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track initialization and state changes across renders
  const isInitializedRef = useRef(false);
  const authChangeSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;
    
    // Skip if already initialized in this component instance
    if (isInitializedRef.current) {
      return;
    }
    
    // Mark as initialized in this component instance
    isInitializedRef.current = true;
    
    const initializeAuth = async () => {
      try {
        // Set loading state
        setLoading(true);
        
        console.log("Initializing auth state");
        
        // First set up the auth state listener
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          // Only proceed if component still mounted
          if (!isMountedRef.current) {
            console.log("Auth state changed but component unmounted, ignoring");
            return;
          }
          
          // Only log meaningful auth state changes, not every event
          if (event !== 'INITIAL_SESSION') {
            console.log(`Auth state changed: ${event}`);
          }
          
          // Update state with the new session
          setSession(newSession);
          
          // For sign in and token refresh events, update user
          if (newSession?.user) {
            setUser(newSession.user);
            
            // For sign in events, track session start time
            if (event === 'SIGNED_IN') {
              globalInitState.authSessions.set(
                newSession.user.id, 
                Date.now()
              );
            }
          } else if (event === 'SIGNED_OUT') {
            // Clear user on sign out
            setUser(null);
          }
          
          // Complete loading once we have a definitive auth state
          if (event !== 'INITIAL_SESSION') {
            setLoading(false);
          }
        });
        
        // Store the subscription for cleanup
        authChangeSubscriptionRef.current = data.subscription;
        
        // Then check for an existing session
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Only set session if component still mounted
        if (isMountedRef.current) {
          // Only set session if we got data back
          if (sessionData) {
            setSession(sessionData.session);
            setUser(sessionData.session?.user ?? null);
            
            // Track session if user exists
            if (sessionData.session?.user) {
              globalInitState.authSessions.set(
                sessionData.session.user.id,
                Date.now()
              );
            }
          }
          
          // Complete loading after initial check
          setLoading(false);
          
          // Mark global initialization as complete
          globalInitState.initialized = true;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Only update state if component still mounted
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    // Return cleanup function to unsubscribe when component unmounts
    return () => {
      isMountedRef.current = false;
      
      if (authChangeSubscriptionRef.current) {
        console.log("Cleaning up auth listener");
        authChangeSubscriptionRef.current.unsubscribe();
        authChangeSubscriptionRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  return { user, session, loading };
};
