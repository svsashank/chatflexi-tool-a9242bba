
import React from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import SettingsModal from "./SettingsModal";

const ChatContainer = () => {
  return (
    <div className="flex flex-col h-screen">
      <ChatHeader />
      <ChatMessages />
      <ChatInput />
      <SettingsModal />
    </div>
  );
};

export default ChatContainer;
