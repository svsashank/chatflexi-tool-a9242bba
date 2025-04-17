
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RLSErrorAlertProps {
  className?: string;
  onRetry?: () => void;
}

const RLSErrorAlert: React.FC<RLSErrorAlertProps> = ({ className, onRetry }) => {
  return (
    <Alert variant="error" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Database Permission Error</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Your profile data cannot be accessed due to a Row-Level Security policy error in the database.
        </p>
        <p className="text-xs text-muted-foreground">
          Error: "infinite recursion detected in policy for relation profiles"
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Retry Loading
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default RLSErrorAlert;
