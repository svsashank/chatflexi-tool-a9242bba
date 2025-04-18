
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
  const loadingMessagesRef = useRef<{[key: string]: boolean}>({});

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

  // Optimized loading for current conversation messages
  useEffect(() => {
    if (currentConversationId) {
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      
      // Check if we should load messages (don't have them yet and haven't started loading)
      if (currentConversation && 
          (!currentConversation.messages || currentConversation.messages.length === 0) && 
          !loadingMessagesRef.current[currentConversationId]) {
        
        // Mark as loading to prevent duplicate requests
        loadingMessagesRef.current[currentConversationId] = true;
        
        console.log("Index page: Loading messages for current conversation:", currentConversationId);
        loadMessagesForConversation(currentConversationId)
          .catch(err => {
            console.error("Failed to load messages:", err);
          })
          .finally(() => {
            // Reset the loading flag even if there was an error
            loadingMessagesRef.current[currentConversationId] = false;
          });
      }
    }
  }, [currentConversationId, loadMessagesForConversation, conversations]);

  return <ChatContainer />;
};

export default Index;
