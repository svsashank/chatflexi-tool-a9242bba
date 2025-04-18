
import React, { useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./chat-input";
import { useChatStore } from "@/store";

const ChatContainer = () => {
  const { 
    selectedModel
  } = useChatStore();
  
  // Simple mounting log to avoid redundant operations
  useEffect(() => {
    if (selectedModel?.name) {
      console.log("ChatContainer mounted, current selected model:", selectedModel.name);
    }
    
    // Return cleanup function
    return () => {
      // Clean up any resources or event listeners if needed
    };
  }, [selectedModel?.name]);

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <ChatMessages />
      </div>
      <ChatInput />
    </div>
  );
};

// Using React.memo to prevent unnecessary re-renders
export default React.memo(ChatContainer);
