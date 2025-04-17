
import React, { useEffect } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const { 
    currentConversationId,
    loadMessagesForConversation,
    conversations
  } = useChatStore();

  // Load messages for the current conversation when it changes
  useEffect(() => {
    if (currentConversationId && user) {
      console.log("Index page: Loading messages for current conversation:", currentConversationId);
      
      // Check if we need to load messages (if they're not already loaded)
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      if (currentConversation && (!currentConversation.messages || currentConversation.messages.length === 0)) {
        loadMessagesForConversation(currentConversationId).catch(err => {
          console.error("Failed to load messages:", err);
        });
      }
    }
  }, [currentConversationId, loadMessagesForConversation, conversations, user]);

  return <ChatContainer />;
};

export default Index;
