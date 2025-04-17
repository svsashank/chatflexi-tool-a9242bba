
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RLSErrorAlertProps {
  className?: string;
  onRetry?: () => void;
  errorCode?: string;
  errorMessage?: string;
}

const RLSErrorAlert: React.FC<RLSErrorAlertProps> = ({ 
  className, 
  onRetry,
  errorCode = "42P17",
  errorMessage = "Policy recursion issue"
}) => {
  return (
    <Alert variant="error" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Database Permission Error</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Your profile data cannot be accessed due to a Row-Level Security policy error in the database.
        </p>
        <p className="text-xs text-muted-foreground">
          Error code: {errorCode} - {errorMessage}
        </p>
        <div className="flex flex-col space-y-2 mt-3">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry Loading
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">
              Re-authenticate
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default RLSErrorAlert;
