
import React from 'react';
import { Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComputeCreditsProps {
  credits: number;
  tokens: {
    input: number;
    output: number;
  };
  modelId: string;
}

const ComputeCredits: React.FC<ComputeCreditsProps> = ({ credits, tokens, modelId }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Zap size={14} className="text-amber-500" />
            <span>{credits.toLocaleString()} CR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              {credits.toLocaleString()} Compute Credits
            </p>
            <div className="text-xs space-y-0.5">
              <p>Model: {modelId}</p>
              <p>Input tokens: {tokens.input.toLocaleString()}</p>
              <p>Output tokens: {tokens.output.toLocaleString()}</p>
              <p>Total tokens: {(tokens.input + tokens.output).toLocaleString()}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComputeCredits;
