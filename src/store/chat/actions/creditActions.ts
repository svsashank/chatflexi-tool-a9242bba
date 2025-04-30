
import { toast } from 'sonner';
import { validateCreditAvailability } from '@/services/creditValidationService';

export const validateCreditsAction = (set: Function, get: Function) => {
  return async (content: string, images: string[] = [], files: string[] = []): Promise<boolean> => {
    const { selectedModel, handleError } = get();
    const userId = localStorage.getItem('userId');
    
    try {
      // Skip validation completely for non-authenticated users
      if (!userId) {
        return true;
      }
      
      // Process credit validation
      const validation = await validateCreditAvailability(content, selectedModel, userId, images, files);
      
      // Handle insufficient credits case
      if (!validation.isValid) {
        console.warn("Insufficient credits", validation);
        
        toast.error("Insufficient credits", {
          description: validation.message || "Please upgrade your account to continue",
          action: {
            label: "Upgrade",
            onClick: () => window.location.href = "/upgrade"
          }
        });
        
        return false;
      }
      
      // For low credit warning but still valid
      if (validation.balance !== null && validation.balance < 50 && validation.balance > 0) {
        toast("Credit balance is low", {
          description: `You have approximately ${Math.floor(validation.balance)} credits remaining.`,
          action: {
            label: "Upgrade",
            onClick: () => window.location.href = "/upgrade"
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error("Credit validation error:", error);
      handleError("Could not validate credit availability");
      // Allow operation to proceed in case of validation errors
      return true;
    }
  };
};
