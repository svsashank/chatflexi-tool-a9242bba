
import React, { useEffect, useRef } from "react";
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
  } = useChatStore();
  
  // Track if we've already loaded conversations in this component instance
  const loadedRef = useRef(false);

  // Only load conversations when the user is authenticated and we haven't already loaded them
  useEffect(() => {
    if (user && !loadedRef.current && conversations.length === 0) {
      loadedRef.current = true;
      console.log("Index page: Loading conversations for authenticated user");
      loadConversationsFromDB().catch(err => {
        console.error("Failed to load conversations:", err);
      });
    }
  }, [user, loadConversationsFromDB, conversations.length]);

  // Load messages for the current conversation if it changes and we have conversations but no messages
  useEffect(() => {
    if (currentConversationId) {
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      const shouldLoadMessages = currentConversation && 
                               (!currentConversation.messages || currentConversation.messages.length === 0);
      
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
