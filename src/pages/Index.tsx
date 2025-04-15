
import React, { useEffect } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const { 
    loadConversationsFromDB, 
    currentConversationId, 
    loadMessagesForConversation,
    conversations,
    initializeSelectedModel
  } = useChatStore();

  // Initialize the selected model from localStorage
  useEffect(() => {
    initializeSelectedModel();
  }, [initializeSelectedModel]);

  // Load conversations when the user is authenticated and the page loads
  useEffect(() => {
    if (user) {
      console.log("Index page: Loading conversations for authenticated user");
      loadConversationsFromDB().catch(err => {
        console.error("Failed to load conversations:", err);
      });
    }
  }, [user, loadConversationsFromDB]);

  // Load messages for the current conversation if it changes or if we have conversations but no messages
  useEffect(() => {
    if (currentConversationId) {
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      const shouldLoadMessages = !currentConversation?.messages?.length;
      
      if (shouldLoadMessages) {
        console.log("Index page: Loading messages for current conversation:", currentConversationId);
        loadMessagesForConversation(currentConversationId).catch(err => {
          console.error("Failed to load messages:", err);
        });
      }
    }
  }, [currentConversationId, loadMessagesForConversation, conversations]);

  return <ChatContainer />;
};

export default Index;
