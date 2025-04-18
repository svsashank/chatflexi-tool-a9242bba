
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationItem from "./ConversationItem";
import { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRefresh?: () => void;
}

const ConversationList = ({ 
  conversations,
  currentConversationId,
  isLoading,
  onSelect,
  onDelete,
  onRefresh
}: ConversationListProps) => {
  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <RefreshCw 
          size={24} 
          className="animate-spin text-muted-foreground mb-3"
          onClick={onRefresh}
          role="button"
          aria-label="Refresh conversations"
        />
        <p className="text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={24} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">No conversations found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a new conversation to get started
        </p>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="mt-4 text-xs text-primary hover:underline"
          >
            Refresh conversations
          </button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === currentConversationId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
      {onRefresh && (
        <div className="p-2 text-center">
          <button 
            onClick={onRefresh}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Refresh conversations
          </button>
        </div>
      )}
    </ScrollArea>
  );
};

export default ConversationList;
