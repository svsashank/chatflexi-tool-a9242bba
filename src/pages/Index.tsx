
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
  // Track component mount state
  const isMountedRef = useRef(true);
  // Abort controller reference
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Create a new abort controller for this effect instance
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Only load messages for the current conversation if needed
    const loadMessages = async () => {
      if (!currentConversationId || signal.aborted) {
        return; // Skip if no conversation is selected or aborted
      }
      
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      
      // Check if we should load messages (don't have them yet and haven't started loading)
      if (currentConversation && 
          (!currentConversation.messages || currentConversation.messages.length === 0) && 
          !loadingMessagesRef.current[currentConversationId]) {
        
        // Mark as loading to prevent duplicate requests
        loadingMessagesRef.current[currentConversationId] = true;
        
        console.log("Index page: Loading messages for current conversation:", currentConversationId);
        try {
          await loadMessagesForConversation(currentConversationId);
        } catch (err) {
          if (!signal.aborted && isMountedRef.current) {
            console.error("Failed to load messages:", err);
          }
        } finally {
          // Reset the loading flag even if there was an error, but only if not aborted
          if (!signal.aborted && isMountedRef.current) {
            loadingMessagesRef.current[currentConversationId] = false;
          }
        }
      }
    };
    
    loadMessages();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      // Abort any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [currentConversationId, loadMessagesForConversation, conversations]);

  return <ChatContainer />;
};

export default Index;
