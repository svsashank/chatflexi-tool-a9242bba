
import React, { useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./chat-input";
import { useChatStore } from "@/store";

const ChatContainer = () => {
  const { 
    currentConversationId, 
    selectedModel,
  } = useChatStore();
  
  // Make sure the selected model is initialized when the chat container mounts
  useEffect(() => {
    // Use less verbose logging to reduce console noise
    if (selectedModel?.name) {
      console.log("ChatContainer mounted, current selected model:", selectedModel.name);
    }
  }, [selectedModel]);

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

export default ChatContainer;
