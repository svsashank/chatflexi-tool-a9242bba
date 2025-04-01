
import React from "react";
import ConversationHistory from "./ConversationHistory";
import useChatStore from "@/store/chatStore";
import { MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";

const ChatHeader = () => {
  const { selectedModel, conversations, currentConversationId } = useChatStore();
  const { openSettings } = useSettingsStore();
  
  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <ConversationHistory />
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary hidden sm:block" />
            <h1 className="text-lg font-semibold truncate max-w-[150px] sm:max-w-[250px]">
              {currentConversation?.title || "ChatFlexi"}
            </h1>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={openSettings}
          className="h-8 w-8"
        >
          <Settings size={18} />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
