
import React from "react";
import { History, Plus } from "lucide-react";
import { useChatStore } from "@/store";
import { useConversationCreation } from "@/hooks/useConversationCreation";
import UserMenu from "./UserMenu";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import ConversationHistory from "./ConversationHistory";

const ChatHeader = () => {
  const { conversations, currentConversationId } = useChatStore();
  const { createConversation, isCreating } = useConversationCreation();
  
  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  const handleNewChat = async () => {
    try {
      await createConversation();
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  return (
    <header className="border-b border-border py-2 px-4 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <ConversationHistory />
        
        <h1 className="text-lg font-medium truncate max-w-[180px] sm:max-w-sm md:max-w-md">
          {currentConversation?.title || "New Conversation"}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewChat}
                disabled={isCreating}
              >
                <Plus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <UserMenu />
      </div>
    </header>
  );
};

export default ChatHeader;
