
import React, { useEffect, useState } from "react";
import { History, MessageSquare, Search, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useChatStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const ConversationHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId,
    createConversation,
    deleteConversation,
    loadConversationsFromDB,
    refreshConversations
  } = useChatStore();

  // Track initialization to prevent duplicate loads
  const [initialized, setInitialized] = useState(false);

  // Load conversations when the component is first mounted and user is authenticated
  useEffect(() => {
    const initializeConversations = async () => {
      if (!user || initialized || conversations.length > 0) {
        return;
      }
      
      try {
        setIsLoading(true);
        console.log("ConversationHistory: Loading conversations from database");
        await loadConversationsFromDB();
        setInitialized(true);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      initializeConversations();
    }
  }, [user, initialized, conversations.length, loadConversationsFromDB]);

  // Filter conversations based on search query
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conversation => 
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Handle conversation selection with error handling
  const handleConversationSelect = async (id: string) => {
    try {
      console.log("Selecting conversation:", id);
      
      // Verify the conversation exists before attempting to select it
      const conversationExists = conversations.some(conv => conv.id === id);
      if (!conversationExists) {
        console.error("Conversation not found:", id);
        toast.error("The selected conversation could not be found");
        return;
      }
      
      // Set the current conversation ID (this will trigger message loading)
      await setCurrentConversationId(id);
      setIsOpen(false); // Close the sheet on mobile after selection
    } catch (error) {
      console.error("Error selecting conversation:", error);
      toast.error("Could not load the selected conversation");
    }
  };

  // Create a new conversation with loading state
  const handleCreateConversation = async () => {
    try {
      setIsLoading(true);
      const newId = await createConversation();
      if (newId) {
        setIsOpen(false);
        toast.success("New conversation created");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Could not create a new conversation");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a conversation with confirmation and error handling
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Could not delete the conversation");
    }
  };

  // Handle refreshing conversations
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
        
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="flex flex-col h-[calc(100vh-180px)]">
          <Button
            onClick={handleCreateConversation}
            variant="ghost"
            className="flex items-center justify-start gap-2 py-3 px-4 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            New Chat
          </Button>
          
          <ScrollArea className="flex-1">
            {isLoading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <RefreshCw size={24} className="animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Create a new conversation to get started"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center w-full px-3 py-3 text-left border-b border-border hover:bg-muted/20 transition-colors ${
                    conversation.id === currentConversationId ? "bg-primary/10" : ""
                  }`}
                >
                  <button
                    onClick={() => handleConversationSelect(conversation.id)}
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
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        >
                          <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete conversation</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationHistory;
