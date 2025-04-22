
import React, { useEffect, useRef } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const { 
    loadMessagesForConversation,
    currentConversationId,
    conversations,
  } = useChatStore();
  
  // Track if we're loading messages for conversations to prevent duplicate requests
  const loadingMessagesRef = useRef<{[key: string]: boolean}>({});

  // Only load messages for the current conversation if needed
  useEffect(() => {
    if (!currentConversationId) {
      return; // Skip if no conversation is selected
    }
    
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
  }, [currentConversationId, loadMessagesForConversation, conversations]);

  return <ChatContainer />;
};

export default Index;
