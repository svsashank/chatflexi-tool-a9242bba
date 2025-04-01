
import React from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { useChatStore } from "@/store";

const ChatContainer = () => {
  const { conversations, currentConversationId } = useChatStore();
  const hasMessages = conversations.find(
    conv => conv.id === currentConversationId
  )?.messages.length > 0;

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
