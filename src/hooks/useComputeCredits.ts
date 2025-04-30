
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { UserCreditStatus } from '@/types';
import { getCreditStatus } from '@/services/creditValidationService';

interface UseComputeCreditsReturn {
  creditStatus: UserCreditStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
}

// Local cache for credits with expiry
const creditsCache = {
  status: null as UserCreditStatus | null,
  userId: null as string | null,
  timestamp: 0,
  ttl: 10000, // 10 seconds TTL
};

export const useComputeCredits = (userId?: string): UseComputeCreditsReturn => {
  const [creditStatus, setCreditStatus] = useState<UserCreditStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we can use the cached value
  const canUseCachedValue = useCallback(() => {
    if (!userId || !creditsCache.status || creditsCache.userId !== userId) {
      return false;
    }
    
    const now = Date.now();
    return (now - creditsCache.timestamp) < creditsCache.ttl;
  }, [userId]);
  
  // Create a debounced fetch function
  const debouncedFetchCredits = useCallback(
    debounce(async (uid: string) => {
      if (canUseCachedValue()) {
        setCreditStatus(creditsCache.status);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching credit status for user:", uid);
        
        const status = await getCreditStatus(uid);
        console.log("Fetched credit status:", status);
        
        // Update cache
        creditsCache.status = status;
        creditsCache.userId = uid;
        creditsCache.timestamp = Date.now();
        
        setCreditStatus(status);
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
      setCreditStatus(creditsCache.status);
      return;
    }
    
    debouncedFetchCredits(userId);
    
    // Clean up debounce on unmount
    return () => {
      debouncedFetchCredits.cancel();
    };
  }, [userId, debouncedFetchCredits, canUseCachedValue]);

  return {
    creditStatus,
    isLoading,
    error,
    refreshCredits
  };
};
