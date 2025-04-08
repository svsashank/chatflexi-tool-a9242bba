
import React from 'react';
import { Cpu } from 'lucide-react';
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
  // Round credits to nearest integer
  const roundedCredits = Math.round(credits);
  const isImageGeneration = tokens.input === 0 && tokens.output === 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Cpu size={14} className="text-cyan-400" />
            <span>{roundedCredits.toLocaleString()} CR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium flex items-center gap-1.5">
              <Cpu size={14} className="text-cyan-400" />
              {roundedCredits.toLocaleString()} Compute Credits
            </p>
            <div className="text-xs space-y-0.5">
              <p>Model: {modelId}</p>
              {isImageGeneration ? (
                <p>Image Generation</p>
              ) : (
                <>
                  <p>Input tokens: {tokens.input.toLocaleString()}</p>
                  <p>Output tokens: {tokens.output.toLocaleString()}</p>
                  <p>Total tokens: {(tokens.input + tokens.output).toLocaleString()}</p>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ComputeCredits;
