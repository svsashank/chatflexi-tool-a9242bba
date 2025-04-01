
import React, { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import useChatStore from "@/store/chatStore";
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

const ChatInput = () => {
  const [inputValue, setInputValue] = useState("");
  const { addMessage, isLoading, selectedModel, selectModel } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      addMessage(inputValue.trim());
      setInputValue("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background/90 backdrop-blur-sm sticky bottom-0 z-10">
      <form 
        onSubmit={handleSubmit} 
        className="relative flex flex-col gap-3 max-w-3xl mx-auto"
      >
        {/* Model selector - now more prominent above the input */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="self-center flex items-center justify-center h-10 gap-2 px-4 rounded-lg border border-primary/20 bg-background hover:bg-accent"
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
            <ScrollArea className="h-80"> {/* Set a fixed height for scrolling */}
              <div className="p-1">
                {AI_MODELS.map((model) => (
                  <DropdownMenuItem 
                    key={model.id}
                    onClick={() => selectModel(model)}
                    className="flex items-center gap-2 cursor-pointer py-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: model.avatarColor }}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                    {selectedModel.id === model.id && (
                      <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-end gap-2">
          <div className="relative flex-1 bg-muted/50 rounded-lg overflow-hidden">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={isLoading}
              className="w-full max-h-[200px] resize-none bg-transparent border-0 py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              rows={1}
            />
          </div>
          
          <Button
            type="submit"
            disabled={inputValue.trim() === "" || isLoading}
            variant={inputValue.trim() === "" || isLoading ? "secondary" : "default"}
            size="icon"
            className="h-10 w-10"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
