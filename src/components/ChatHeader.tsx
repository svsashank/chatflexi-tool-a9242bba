
import React, { useState } from "react";
import { useChatStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Menu, X, PlusCircle, History, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "../hooks/use-mobile";
import ConversationHistory from "./ConversationHistory";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";

const ChatHeader = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const isMobile = useIsMobile();

  const {
    currentConversationId,
    conversations,
    createConversation,
    isLoading,
  } = useChatStore();

  const currentConversation = currentConversationId
    ? conversations.find((c) => c.id === currentConversationId)
    : null;

  const handleNewChat = async () => {
    try {
      await createConversation();
      setShowSidebar(false);
    } catch (error) {
      console.error("Error creating new conversation:", error);
      toast.error("Failed to create new conversation");
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Mobile Sidebar Toggle */}
        {isMobile && (
          <Button
            onClick={() => setShowSidebar(!showSidebar)}
            variant="ghost"
            size="icon"
            className="mr-2 h-9 w-9 rounded-md lg:hidden"
          >
            <Menu size={18} />
          </Button>
        )}

        {/* Conversation Title */}
        <h1 className="text-lg font-semibold truncate">
          {currentConversation?.title || "New Conversation"}
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Image Generation Button */}
          <Link
            to="/image-generation"
            className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-all"
            title="Generate Images"
          >
            <ImageIcon size={18} className="text-muted-foreground" />
          </Link>
        
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
            disabled={isLoading}
            title="New Chat"
          >
            <PlusCircle size={18} className="text-muted-foreground" />
          </Button>

          {/* History Button (mobile only) */}
          {isMobile && (
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md lg:hidden"
              title="Chat History"
            >
              <History size={18} className="text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobile && showSidebar && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <Button
                onClick={() => setShowSidebar(false)}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-md"
              >
                <X size={18} />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 p-2">
                <Button
                  onClick={handleNewChat}
                  variant="outline"
                  className="flex items-center justify-start gap-2 h-10 mb-2"
                >
                  <PlusCircle size={16} />
                  New Chat
                </Button>
                
                <ConversationHistory />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </header>
  );
};

export default ChatHeader;
