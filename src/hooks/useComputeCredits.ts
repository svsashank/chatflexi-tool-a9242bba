
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';

interface UseComputeCreditsReturn {
  totalCredits: number | null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
}

// Local cache for credits with expiry
const creditsCache = {
  value: null as number | null,
  userId: null as string | null,
  timestamp: 0,
  ttl: 10000, // 10 seconds TTL
};

export const useComputeCredits = (userId?: string): UseComputeCreditsReturn => {
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we can use the cached value
  const canUseCachedValue = useCallback(() => {
    if (!userId || !creditsCache.value || creditsCache.userId !== userId) {
      return false;
    }
    
    const now = Date.now();
    return (now - creditsCache.timestamp) < creditsCache.ttl;
  }, [userId]);
  
  // Create a debounced fetch function
  const debouncedFetchCredits = useCallback(
    debounce(async (uid: string) => {
      if (canUseCachedValue()) {
        setTotalCredits(creditsCache.value);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching credits for user:", uid);
        
        const { data, error } = await supabase
          .from('user_compute_credits')
          .select('total_credits')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user compute credits:', error);
          setError(error.message);
          return;
        }
        
        const credits = data?.total_credits || 0;
        console.log("Fetched total credits:", credits);
        
        // Update cache
        creditsCache.value = credits;
        creditsCache.userId = uid;
        creditsCache.timestamp = Date.now();
        
        setTotalCredits(credits);
      } catch (err: any) {
        console.error('Exception in credit fetch:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 300), // 300ms debounce time
    [canUseCachedValue]
  );

  // The exposed refresh method that's not debounced
  const refreshCredits = useCallback(async () => {
    if (!userId) return;
    
    // Invalidate cache to force refresh
    if (creditsCache.userId === userId) {
      creditsCache.timestamp = 0;
    }
    
    await debouncedFetchCredits(userId);
  }, [userId, debouncedFetchCredits]);

  useEffect(() => {
    if (!userId) return;
    
    // Use cache if available
    if (canUseCachedValue()) {
      setTotalCredits(creditsCache.value);
      return;
    }
    
    debouncedFetchCredits(userId);
    
    // Clean up debounce on unmount
    return () => {
      debouncedFetchCredits.cancel();
    };
  }, [userId, debouncedFetchCredits, canUseCachedValue]);

  return {
    totalCredits,
    isLoading,
    error,
    refreshCredits
  };
};
