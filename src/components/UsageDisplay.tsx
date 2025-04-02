
import React from 'react';

interface UsageDisplayProps {
  usageText: string;
}

const UsageDisplay: React.FC<UsageDisplayProps> = ({ usageText }) => {
  return (
    <div className="mt-2 text-xs font-mono p-2 bg-muted/50 rounded whitespace-pre overflow-x-auto">
      {usageText}
    </div>
  );
};

export default UsageDisplay;
