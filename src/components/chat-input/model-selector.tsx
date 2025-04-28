
import React, { useState, useMemo } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useChatStore } from "@/store";
import { AI_MODELS, MODEL_GROUPS, PRICING_TIERS, SPEED_TIERS } from "@/constants";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export const ModelSelector = () => {
  const { selectedModel, setSelectedModel } = useChatStore();
  
  // Group models by provider for better organization
  const modelsByProvider = useMemo(() => {
    const grouped: Record<string, typeof AI_MODELS> = {};
    
    AI_MODELS.forEach(model => {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    });
    
    return grouped;
  }, []);
  
  // Sort providers by prominence
  const sortedProviders = useMemo(() => {
    const providerOrder = ['openai', 'anthropic', 'google', 'xai', 'deepseek'];
    return Object.keys(modelsByProvider).sort((a, b) => {
      return providerOrder.indexOf(a) - providerOrder.indexOf(b);
    });
  }, [modelsByProvider]);
  
  // Format context window size for display
  const formatContextWindow = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${tokens / 1000000}M tokens`;
    } else if (tokens >= 1000) {
      return `${tokens / 1000}K tokens`;
    } else {
      return `${tokens} tokens`;
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center h-9 gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-background hover:bg-accent transition-all"
          aria-label="Select AI model"
        >
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: selectedModel.avatarColor }}
          />
          <span className="text-sm font-medium">
            {selectedModel.name}
            <span className="text-xs ml-1.5 text-muted-foreground hidden sm:inline">
              ({selectedModel.provider})
            </span>
          </span>
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64 mt-1 border-primary/20">
        <DropdownMenuLabel className="text-center">Choose an AI Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {sortedProviders.map(provider => (
            <DropdownMenuGroup key={provider}>
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {MODEL_GROUPS[provider] || provider}
              </DropdownMenuLabel>
              {modelsByProvider[provider].map((model) => (
                <DropdownMenuItem 
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className="flex flex-col items-start gap-1 cursor-pointer py-3 px-3 hover:bg-accent/50 data-[active]:bg-accent/50 data-[state=checked]:bg-accent/50 focus:bg-accent/50"
                  data-active={selectedModel.id === model.id}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: model.avatarColor }}
                      />
                      <div className="font-medium">{model.name}</div>
                    </div>
                    
                    {selectedModel.id === model.id && (
                      <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground ml-5">{model.description}</div>
                  
                  <div className="flex flex-wrap gap-1 mt-1 ml-5">
                    {model.capabilities.includes('images') && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-primary/5 text-primary border-primary/20">
                        Vision
                      </Badge>
                    )}
                    
                    {model.contextWindow && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-accent/30 text-accent-foreground border-accent-foreground/20">
                        {formatContextWindow(model.contextWindow)}
                      </Badge>
                    )}
                    
                    {model.responseSpeed && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-secondary/20 text-secondary-foreground border-secondary/20">
                              {SPEED_TIERS[model.responseSpeed]?.label || model.responseSpeed}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {SPEED_TIERS[model.responseSpeed]?.description || 'Response speed rating'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {model.pricing && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`text-[10px] py-0 h-4 border-amber-500/20
                              ${model.pricing === 'premium' ? 'bg-amber-500/20 text-amber-700' : 
                                model.pricing === 'standard' ? 'bg-blue-500/20 text-blue-700' : 
                                'bg-green-500/20 text-green-700'}`}>
                              {PRICING_TIERS[model.pricing]?.label || model.pricing}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {PRICING_TIERS[model.pricing]?.description || 'Pricing tier'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {model.specialMode && (
                      <Badge className="text-[10px] py-0 h-4 bg-purple-500/20 text-purple-700 border-purple-500/20">
                        <Sparkles size={10} className="mr-1" /> {model.specialMode}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
