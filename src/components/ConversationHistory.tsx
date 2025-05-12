
import React, { useState } from "react";
import { History, MessageSquare, Plus, RefreshCw } from "lucide-react";
import { useChatStore } from "@/store";
import { useConversationCreation } from "@/hooks/useConversationCreation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import ConversationSearch from "./conversation/ConversationSearch";
import ConversationList from "./conversation/ConversationList";

const ConversationHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId,
    deleteConversation,
    refreshConversations
  } = useChatStore();

  const { isCreating, createConversation } = useConversationCreation();

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter(conversation => 
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const handleConversationSelect = async (id: string) => {
    try {
      console.log("Selecting conversation:", id);
      
      const conversationExists = conversations.some(conv => conv.id === id);
      if (!conversationExists) {
        console.error("Conversation not found:", id);
        toast.error("The selected conversation could not be found");
        return;
      }
      
      await setCurrentConversationId(id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error selecting conversation:", error);
      toast.error("Could not load the selected conversation");
    }
  };

  const handleCreateConversation = async () => {
    try {
      setIsLoading(true);
      await createConversation();
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Could not delete the conversation");
    }
  };

  const handleRefreshConversations = async () => {
    try {
      setIsLoading(true);
      await refreshConversations();
    } catch (error) {
      console.error("Error refreshing conversations:", error);
      toast.error("Could not refresh conversations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
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
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              Conversations
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={handleRefreshConversations}
                    disabled={isLoading}
                  >
                    <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh conversations</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SheetTitle>
        </SheetHeader>
        
        <ConversationSearch 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        
        <div className="flex flex-col h-[calc(100vh-180px)]">
          <Button
            onClick={handleCreateConversation}
            variant="ghost"
            className="flex items-center justify-start gap-2 py-3 px-4 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            disabled={isLoading || isCreating}
          >
            {(isLoading || isCreating) ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            New Chat
          </Button>
          
          <ConversationList
            conversations={filteredConversations}
            currentConversationId={currentConversationId}
            isLoading={isLoading}
            onSelect={handleConversationSelect}
            onDelete={handleDeleteConversation}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationHistory;
