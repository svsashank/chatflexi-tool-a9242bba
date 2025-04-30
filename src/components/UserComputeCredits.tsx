
import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useComputeCredits } from '@/hooks/useComputeCredits';
import { useAuth } from '@/contexts/AuthContext';

const UserComputeCredits = () => {
  const { user } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  const { creditStatus, isLoading, error } = useComputeCredits(user?.id);
  
  if (isLoading) {
    return <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Zap size={14} className="text-amber-500" />
      <span>Loading...</span>
    </div>;
  }

  if (error || !creditStatus) {
    return <div className="flex items-center gap-1 text-xs text-red-500">
      <Zap size={14} className="text-amber-500" />
      <span>Error loading credits</span>
    </div>;
  }

  // Round balance to nearest integer
  const roundedBalance = Math.round(creditStatus.balance);
  const { isLow, isDepletedOrOverdraft, overdraftAmount } = creditStatus;

  const creditDisplay = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs transition-colors ${
            isDepletedOrOverdraft 
              ? 'text-red-500 hover:text-red-600' 
              : isLow
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-muted-foreground hover:text-foreground'
          }`}>
            {isDepletedOrOverdraft ? (
              <AlertTriangle size={14} className="text-red-500" />
            ) : isLow ? (
              <AlertTriangle size={14} className="text-amber-500" />
            ) : (
              <Zap size={14} className="text-amber-500" />
            )}
            <span>Balance: {roundedBalance.toLocaleString()} CR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              {roundedBalance.toLocaleString()} Credit Balance
            </p>
            <p className="text-xs">
              {isDepletedOrOverdraft 
                ? `You've ${overdraftAmount > 0 ? `exceeded your credit balance by ${Math.ceil(overdraftAmount)}` : 'depleted your credits'}. Please upgrade to continue using the service.`
                : isLow
                  ? "Your credit balance is running low. Consider upgrading soon to avoid interruptions."
                  : "This represents your available compute credits for messages and operations."}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleUpgrade = () => {
    window.location.href = '/upgrade';
  };

  return (
    <>
      <div onClick={() => (isLow || isDepletedOrOverdraft) && setShowUpgradeDialog(true)} 
           className={(isLow || isDepletedOrOverdraft) ? 'cursor-pointer' : ''}>
        {creditDisplay}
      </div>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDepletedOrOverdraft ? 'Credits Depleted' : 'Low Credits'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDepletedOrOverdraft
                ? `You have ${overdraftAmount > 0 ? `exceeded your credit balance by ${Math.ceil(overdraftAmount)}` : 'no credits remaining'}. To continue using our service, please upgrade your account to receive additional compute credits.`
                : `You have ${roundedBalance.toLocaleString()} compute credits remaining. To avoid interruptions to your service, consider upgrading your account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgrade}>
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserComputeCredits;
