
import React from "react";
import ConversationHistory from "./ConversationHistory";
import useChatStore from "@/store/chatStore";

const ChatHeader = () => {
  const { selectedModel } = useChatStore();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <ConversationHistory />
          <h1 className="text-lg font-semibold">ChatFlexi</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: selectedModel.avatarColor }}
            />
            <span className="text-sm hidden md:block">{selectedModel.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
