
import React from "react";
import { ChevronDown } from "lucide-react";
import { useChatStore } from "@/store";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AI_MODELS } from "@/constants";
import { Button } from "@/components/ui/button";
import { AIModelCapability } from "@/types";

interface ModelSelectorProps {
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ className }) => {
  const { selectedModel, setSelectedModel } = useChatStore();
  
  return (
    <div className={`flex justify-center ${className || ""}`}>
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
          <ScrollArea className="h-80">
            <div className="p-1">
              {AI_MODELS.map((model) => (
                <DropdownMenuItem 
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className="flex items-center gap-2 cursor-pointer py-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: model.avatarColor }}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.provider}</span>
                  </div>
                  
                  <div className="ml-auto flex gap-1">
                    {model.capabilities.includes('images') && (
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">Vision</span>
                    )}
                    {model.capabilities.includes('reasoning') && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">Reasoning</span>
                    )}
                  </div>
                  
                  {selectedModel.id === model.id && (
                    <span className="w-2 h-2 rounded-full bg-primary ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ModelSelector;
