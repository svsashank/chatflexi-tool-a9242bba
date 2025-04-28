
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
  const { totalCredits, isLoading, error } = useComputeCredits(user?.id);
  
  if (isLoading) {
    return <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Zap size={14} className="text-amber-500" />
      <span>Loading...</span>
    </div>;
  }

  if (error) {
    return <div className="flex items-center gap-1 text-xs text-red-500">
      <Zap size={14} className="text-amber-500" />
      <span>Error loading credits</span>
    </div>;
  }

  if (totalCredits === null) {
    return null;
  }

  // Round total credits to nearest integer
  const roundedCredits = Math.round(totalCredits);
  const isLowCredits = roundedCredits < 1000; // Show warning when credits are low

  const creditDisplay = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs transition-colors ${
            isLowCredits 
              ? 'text-red-500 hover:text-red-600' 
              : 'text-muted-foreground hover:text-foreground'
          }`}>
            {isLowCredits ? (
              <AlertTriangle size={14} className="text-red-500" />
            ) : (
              <Zap size={14} className="text-amber-500" />
            )}
            <span>Total: {roundedCredits.toLocaleString()} CR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              {roundedCredits.toLocaleString()} Total Compute Credits Used
            </p>
            <p className="text-xs">
              {isLowCredits 
                ? "Your credits are running low. Please upgrade to continue using the service."
                : "This represents your total compute usage across all conversations."}
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
      <div onClick={() => isLowCredits && setShowUpgradeDialog(true)} 
           className={isLowCredits ? 'cursor-pointer' : ''}>
        {creditDisplay}
      </div>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription>
              You have used {roundedCredits.toLocaleString()} compute credits. To continue using our service,
              please upgrade your account to receive additional compute credits.
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
