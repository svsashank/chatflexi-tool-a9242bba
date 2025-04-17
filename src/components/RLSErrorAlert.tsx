
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Link } from 'react-router-dom';

interface RLSErrorAlertProps {
  className?: string;
}

const RLSErrorAlert: React.FC<RLSErrorAlertProps> = ({ className }) => {
  return (
    <Alert variant="error" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Database Permission Error</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          Your profile data cannot be accessed due to a Row-Level Security policy error in the database.
        </p>
        <p className="text-xs">
          Error: "infinite recursion detected in policy for relation profiles"
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default RLSErrorAlert;
