
import React, { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store";
import MessageItem from "./MessageItem";
import { User, Hexagon, Search, Link } from "lucide-react";
import { toast } from "sonner"; 

const ChatMessages = () => {
  const { 
    conversations, 
    currentConversationId, 
    isLoading, 
    processingUrls, 
    createConversation 
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Optimize loading detection with useCallback to prevent recreations
  const handleLoadingTimeout = useCallback(() => {
    toast.error("Response is taking longer than expected. You may need to try again.");
  }, []);
  
  // Optimize the loading timeout with cleanup
  useEffect(() => {
    if (isLoading) {
      // Clear any existing timeout to prevent duplicate notifications
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a new timeout
      loadingTimeoutRef.current = setTimeout(handleLoadingTimeout, 15000);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isLoading, handleLoadingTimeout]);

  // Memoize current conversation lookup for performance
  const currentConversation = React.useMemo(() => 
    conversations.find(conv => conv.id === currentConversationId),
    [conversations, currentConversationId]
  );

  // Handle scroll events to determine if auto-scroll should be enabled
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      setIsAutoScrollEnabled(isAtBottom);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Optimize scroll behavior with useCallback
  const scrollToBottom = useCallback(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAutoScrollEnabled]);

  // Scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [
    currentConversation?.messages, 
    isLoading, 
    processingUrls, 
    scrollToBottom
  ]);
  
  // Create a new conversation if none exists
  useEffect(() => {
    if (!currentConversation && conversations.length === 0) {
      createConversation();
    }
  }, [currentConversation, conversations.length, createConversation]);

  if (!currentConversation) {
    return <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
      <div className="animate-spin">
        <Hexagon size={24} className="text-primary" />
      </div>
    </div>;
  }

  // Memoize the computation of lastAssistantIndex to prevent recalculation on every render
  const lastAssistantIndex = React.useMemo(() => {
    return currentConversation.messages
      .map((msg, index) => ({ role: msg.role, index }))
      .filter(item => item.role === 'assistant')
      .pop()?.index;
  }, [currentConversation.messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      {currentConversation.messages.length === 0 && !isLoading && !processingUrls ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
          <div className="flex gap-2 mb-4">
            {[
              { icon: <User size={24} />, color: 'bg-muted' },
              { 
                icon: (
                  <div className="relative">
                    <Hexagon size={24} className="text-primary" fill="#9b87f5" stroke="#7E69AB" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-white">K</div>
                    </div>
                  </div>
                ), 
                color: 'bg-primary/20' 
              }
            ].map((item, i) => (
              <div key={i} className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                {item.icon}
              </div>
            ))}
          </div>
          <h3 className="text-xl font-semibold text-gradient-primary mb-2">
            Start a conversation
          </h3>
          <p className="text-muted-foreground max-w-md">
            Choose a model from the dropdown above and start chatting. You can switch models anytime while maintaining context.
          </p>
        </div>
      ) : (
        <>
          {currentConversation.messages.map((message, index) => (
            <div key={message.id}>
              <MessageItem 
                message={message} 
                showTotalCredits={index === lastAssistantIndex}
              />
              {message.role === 'assistant' && message.webSearchResults && message.webSearchResults.length > 0 && (
                <div className="ml-12 mt-1 flex items-center text-xs text-muted-foreground">
                  <Search size={12} className="mr-1" />
                  <span>Web search was used to supplement this response</span>
                </div>
              )}
            </div>
          ))}
          
          {processingUrls && processingUrls.length > 0 && (
            <div className="flex items-start gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Link size={16} className="text-primary" />
              </div>
              <div className="flex-1 p-4 rounded-lg glass-morphism">
                <p className="text-sm text-muted-foreground">
                  {processingUrls}
                </p>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-start gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="relative">
                  <Hexagon size={18} className="text-primary" fill="#9b87f5" stroke="#7E69AB" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs font-bold text-white">K</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 rounded-lg glass-morphism">
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default React.memo(ChatMessages);
