
import React, { useEffect } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const { loadConversationsFromDB, currentConversationId, loadMessagesForConversation } = useChatStore();

  // Load conversations when the user is authenticated and the page loads
  useEffect(() => {
    if (user) {
      console.log("Index page: Loading conversations for authenticated user");
      loadConversationsFromDB().catch(err => {
        console.error("Failed to load conversations:", err);
      });
    }
  }, [user, loadConversationsFromDB]);

  // Load messages for the current conversation if it changes
  useEffect(() => {
    if (currentConversationId) {
      console.log("Index page: Loading messages for current conversation:", currentConversationId);
      loadMessagesForConversation(currentConversationId).catch(err => {
        console.error("Failed to load messages:", err);
      });
    }
  }, [currentConversationId, loadMessagesForConversation]);

  return <ChatContainer />;
};

export default Index;
