
import React, { useEffect } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";

const Index = () => {
  const { 
    loadMessagesForConversation,
    currentConversationId,
    conversations,
  } = useChatStore();
  
  useEffect(() => {
    // Only load messages for the current conversation when needed
    const loadMessages = async () => {
      if (!currentConversationId) {
        return; // Skip if no conversation is selected
      }
      
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      
      // Check if we need to load messages
      if (currentConversation && 
          (!currentConversation.messages || currentConversation.messages.length === 0)) {
        try {
          console.log(`Loading messages for conversation ${currentConversationId}`);
          await loadMessagesForConversation(currentConversationId);
        } catch (err) {
          console.error("Failed to load messages:", err);
        }
      }
    };
    
    loadMessages();
  }, [currentConversationId, loadMessagesForConversation, conversations]);

  return <ChatContainer />;
};

export default Index;
