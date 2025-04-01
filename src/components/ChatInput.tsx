
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
        className="relative flex items-end gap-2 max-w-3xl mx-auto"
      >
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center justify-center h-10 gap-2 px-3 rounded-lg"
              aria-label="Select AI model"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: selectedModel.avatarColor }}
              />
              <span className="text-xs font-medium max-w-24 truncate hidden sm:block">{selectedModel.name}</span>
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>AI Models</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AI_MODELS.map((model) => (
              <DropdownMenuItem 
                key={model.id}
                onClick={() => selectModel(model)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: model.avatarColor }}
                />
                <span className="flex-1">{model.name}</span>
                {model.provider && (
                  <span className="text-xs text-muted-foreground">{model.provider}</span>
                )}
                {selectedModel.id === model.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="submit"
          disabled={inputValue.trim() === "" || isLoading}
          variant={inputValue.trim() === "" || isLoading ? "secondary" : "default"}
          size="icon"
          className="h-10 w-10"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatInput;
