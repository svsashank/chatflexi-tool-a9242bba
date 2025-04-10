import React, { useEffect } from "react";
import { History, MessageSquare, Search, Plus, Trash2 } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";

const ConversationHistory = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuth();
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId,
    createConversation,
    deleteConversation,
    loadConversationsFromDB
  } = useChatStore();

  // If user is logged in but no conversations are loaded, load them
  useEffect(() => {
    if (user && conversations.length === 0) {
      console.log("ConversationHistory: No conversations found, loading from database");
      loadConversationsFromDB().catch(err => {
        console.error("Failed to load conversations:", err);
      });
    }
  }, [user, conversations.length, loadConversationsFromDB]);

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conversation => 
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const handleConversationSelect = async (id: string) => {
    console.log("Selecting conversation:", id);
    try {
      // Verify the conversation exists before setting it
      const conversationExists = conversations.some(conv => conv.id === id);
      if (!conversationExists) {
        console.error("Conversation not found:", id);
        toast({
          title: "Error",
          description: "The selected conversation could not be found",
          variant: "destructive",
        });
        return;
      }
      
      setCurrentConversationId(id);
      setIsOpen(false); // Close the sheet on mobile after selection
    } catch (error) {
      console.error("Error selecting conversation:", error);
      toast({
        title: "Error",
        description: "Could not load the selected conversation",
        variant: "destructive",
      });
    }
  };

  const handleCreateConversation = async () => {
    try {
      await createConversation();
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Could not create a new conversation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Could not delete the conversation",
        variant: "destructive",
      });
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
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare size={18} />
            Conversations
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
          >
            <Plus size={16} />
            New Chat
          </Button>
          
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? "No conversations found" : "No conversations yet"}
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
