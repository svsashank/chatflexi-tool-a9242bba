
import React from "react";
import { History } from "lucide-react";
import { format } from "date-fns";
import useChatStore from "@/store/chatStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ConversationHistory = () => {
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversation,
    createConversation
  } = useChatStore();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30"
          aria-label="Conversation history"
        >
          <History size={18} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          <button
            onClick={createConversation}
            className="flex items-center justify-center py-3 px-4 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            + New Conversation
          </button>
          <div className="overflow-y-auto max-h-[calc(100vh-150px)]">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setCurrentConversation(conversation.id)}
                className={`flex flex-col items-start w-full p-4 text-left border-b border-border hover:bg-muted/20 transition-colors ${
                  conversation.id === currentConversationId ? "bg-primary/10" : ""
                }`}
              >
                <span className="text-sm font-medium truncate w-full">
                  {conversation.title}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {format(new Date(conversation.updatedAt), "MMM d, h:mm a")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationHistory;
