
import React from "react";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Conversation } from "@/types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ConversationItem = ({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) => {
  return (
    <div
      className={`group flex items-center w-full px-3 py-3 text-left border-b border-border hover:bg-muted/20 transition-colors ${
        isActive ? "bg-primary/10" : ""
      }`}
    >
      <button
        onClick={() => onSelect(conversation.id)}
        className="flex-1 flex flex-col items-start truncate"
      >
        <span className="text-sm font-medium truncate w-full text-left">
          {conversation.title}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {format(new Date(conversation.updatedAt), "MMM d, h:mm a")}
        </span>
      </button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full"
              onClick={(e) => onDelete(conversation.id, e)}
            >
              <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete conversation</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ConversationItem;
