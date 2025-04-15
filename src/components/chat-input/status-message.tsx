
import React from "react";

interface StatusMessageProps {
  message: string | null;
}

export const StatusMessage = ({ message }: StatusMessageProps) => {
  if (!message) return null;
  
  return (
    <div className="text-center text-sm py-2 px-3 mb-3 bg-primary/10 text-primary rounded-md flex items-center justify-center">
      <span className="inline-block h-2 w-2 rounded-full bg-primary/60 mr-2 animate-pulse"></span>
      {message}
    </div>
  );
};
