
import { AIModel } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { estimateTokenUsage } from "./tokenEstimationService";

// Thresholds for credit warnings
const LOW_CREDIT_THRESHOLD = 50; // Credits
const ALLOWED_OVERDRAFT = 10; // Small overdraft allowed for better UX

// Cached credit balance
let cachedCreditBalance: {
  userId: string | null;
  balance: number;
  timestamp: number;
} = {
  userId: null,
  balance: 0,
  timestamp: 0
};

// Cache TTL in ms (30 seconds)
const CACHE_TTL = 30000;

/**
 * Get cached credit balance or refresh if expired
 */
export const getCreditBalance = async (userId?: string): Promise<number | null> => {
  if (!userId) return null;
  
  const now = Date.now();
  
  // Return cached value if valid
  if (
    cachedCreditBalance.userId === userId && 
    cachedCreditBalance.timestamp > (now - CACHE_TTL)
  ) {
    return cachedCreditBalance.balance;
  }
  
  // Need to refresh from database
  try {
    const { data, error } = await supabase
      .from('user_compute_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching credit balance:', error);
      return null;
    }
    
    const balance = data?.credit_balance ?? 0;
    
    // Update cache
    cachedCreditBalance = {
      userId,
      balance,
      timestamp: now
    };
    
    return balance;
  } catch (error) {
    console.error('Exception in credit balance fetch:', error);
    return null;
  }
};

/**
 * Update the cached balance optimistically
 */
export const updateCachedBalance = (userId: string, newBalance: number): void => {
  cachedCreditBalance = {
    userId,
    balance: newBalance,
    timestamp: Date.now()
  };
};

/**
 * Check if user has sufficient credits for a message
 */
export const validateCreditAvailability = async (
  content: string,
  model: AIModel,
  userId?: string, 
  images: string[] = [],
  files: string[] = [],
): Promise<{ 
  isValid: boolean; 
  estimatedCost: number;
  balance: number | null;
  message?: string;
}> => {
  // If no authenticated user, skip validation (demo/free tier)
  if (!userId) {
    return { isValid: true, estimatedCost: 0, balance: null };
  }
  
  // Get current balance
  const balance = await getCreditBalance(userId);
  
  // If we can't determine balance, allow operation but warn
  if (balance === null) {
    console.warn('Could not determine credit balance, proceeding with caution');
    return { 
      isValid: true, 
      estimatedCost: 0, 
      balance: null,
      message: 'Could not verify credit balance'
    };
  }
  
  // Estimate cost of this operation
  const estimatedTokens = estimateTokenUsage(content, model, images.length, files.length);
  const estimatedCost = calculateEstimatedCost(estimatedTokens, model.id);
  
  // Check if balance is sufficient (with overdraft allowance)
  const isValid = balance >= (estimatedCost - ALLOWED_OVERDRAFT);
  
  // Return validation result
  return {
    isValid,
    estimatedCost,
    balance,
    message: isValid 
      ? undefined 
      : `Insufficient credits. You need approximately ${Math.ceil(estimatedCost)} credits for this operation but have ${Math.floor(balance)} credits remaining.`
  };
};

/**
 * Get detailed credit status for UI display
 */
export const getCreditStatus = async (userId?: string): Promise<{
  balance: number;
  isLow: boolean;
  isDepletedOrOverdraft: boolean;
  overdraftAmount: number;
}> => {
  const balance = await getCreditBalance(userId) ?? 0;
  
  return {
    balance,
    isLow: balance <= LOW_CREDIT_THRESHOLD && balance > 0,
    isDepletedOrOverdraft: balance <= 0,
    overdraftAmount: balance < 0 ? Math.abs(balance) : 0
  };
};

/**
 * Calculate estimated cost based on token prediction
 */
const calculateEstimatedCost = (
  estimatedTokens: { input: number; output: number; reasoning?: number },
  modelId: string
): number => {
  // Simplified estimation based on token counts
  // In reality we'd use the rates from computeCredits.ts
  const inputRate = 0.01;  // Per token
  const outputRate = 0.02; // Per token
  const reasoningRate = 0.04; // Per token
  
  return (
    estimatedTokens.input * inputRate +
    estimatedTokens.output * outputRate +
    (estimatedTokens.reasoning || 0) * reasoningRate
  );
};
