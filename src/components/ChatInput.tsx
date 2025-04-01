
import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import useChatStore from "@/store/chatStore";

const ChatInput = () => {
  const [inputValue, setInputValue] = useState("");
  const { addMessage, isLoading } = useChatStore();
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
        <button
          type="submit"
          disabled={inputValue.trim() === "" || isLoading}
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${
            inputValue.trim() === "" || isLoading
              ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } transition-colors`}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
