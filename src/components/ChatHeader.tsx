
import React from "react";
import ConversationHistory from "./ConversationHistory";
import useChatStore from "@/store/chatStore";
import { Hexagon, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UserMenu from "./UserMenu";

const ChatHeader = () => {
  const { selectedModel, conversations, currentConversationId, createConversation } = useChatStore();
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
            <div className="relative hidden sm:block">
              <Hexagon size={16} className="text-primary" fill="#9b87f5" stroke="#7E69AB" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[8px] font-bold text-white">K</div>
              </div>
            </div>
            <h1 className="text-lg font-semibold truncate max-w-[150px] sm:max-w-[250px]">
              {currentConversation?.title || "Krix"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={createConversation}
                  className="h-8 w-8"
                >
                  <Plus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openSettings}
            className="h-8 w-8"
          >
            <Settings size={18} />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
