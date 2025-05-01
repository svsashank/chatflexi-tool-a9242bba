
import React, { useEffect, useState } from "react";
import ChatContainer from "@/components/ChatContainer";
import { useChatStore } from "@/store";
import { useConversationCreation } from "@/hooks/useConversationCreation";
import { Conversation } from "@/types";

const Index = () => {
  const { 
    loadMessagesForConversation,
    currentConversationId,
    conversations,
    setCurrentConversationId,
  } = useChatStore();
  
  const { createConversation } = useConversationCreation();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Effect to handle initial conversation loading/creation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        // Only run this once
        if (isInitialized) return;
        
        // If we already have conversations and a current one is selected, just load it
        if (conversations.length > 0 && currentConversationId) {
          console.log("Using existing conversation:", currentConversationId);
          await loadConversationMessages(currentConversationId);
          setIsInitialized(true);
          return;
        }
        
        // If we have conversations but none selected, select the first one
        if (conversations.length > 0 && !currentConversationId) {
          console.log("Selecting first existing conversation:", conversations[0].id);
          setCurrentConversationId(conversations[0].id);
          await loadConversationMessages(conversations[0].id);
          setIsInitialized(true);
          return;
        }
        
        // If we don't have any conversations, create a new one (after a small delay)
        if (conversations.length === 0) {
          console.log("No conversations exist, creating a new one...");
          setTimeout(async () => {
            await createConversation();
            setIsInitialized(true);
          }, 300);
        }
      } catch (err) {
        console.error("Failed to initialize conversation:", err);
        setIsInitialized(true); // Mark as initialized anyway to prevent loops
      }
    };
    
    initializeConversation();
  }, [conversations, currentConversationId, loadMessagesForConversation, setCurrentConversationId, createConversation, isInitialized]);
  
  // Helper function to load messages for a conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    const currentConversation = conversations.find(c => c.id === conversationId);
    
    // Check if we need to load messages
    if (currentConversation && 
        (!currentConversation.messages || currentConversation.messages.length === 0)) {
      try {
        console.log(`Loading messages for conversation ${conversationId}`);
        await loadMessagesForConversation(conversationId);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
  };

  // Effect to load messages when currentConversationId changes (after initial setup)
  useEffect(() => {
    if (isInitialized && currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId, isInitialized]);

  return <ChatContainer />;
};

export default Index;
