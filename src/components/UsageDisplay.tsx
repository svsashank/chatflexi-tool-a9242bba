
import React from 'react';
import { Card } from "@/components/ui/card";

interface UsageDisplayProps {
  usageText: string;
}

const UsageDisplay = ({ usageText }: UsageDisplayProps) => {
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <pre className="p-2 bg-background/50 rounded overflow-auto whitespace-pre font-mono">
        {usageText}
      </pre>
    </div>
  );
};

export default UsageDisplay;
