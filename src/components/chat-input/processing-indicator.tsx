
import React from "react";

interface ProcessingIndicatorProps {
  isLoading: boolean;
  processingUrls: string | null;
}

export const ProcessingIndicator = ({ isLoading, processingUrls }: ProcessingIndicatorProps) => {
  if (!isLoading) return null;
  
  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse"></div>
      <span>{processingUrls || "Processing your request..."}</span>
    </div>
  );
};
