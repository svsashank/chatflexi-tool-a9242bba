
import React, { useEffect, useRef } from "react";
import { useChatStore } from "@/store";
import MessageItem from "./MessageItem";
import { User, Hexagon, Search, FileText } from "lucide-react";

const ChatMessages = () => {
  const { conversations, currentConversationId, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
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

  // Scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentConversation?.messages, isLoading, isAutoScrollEnabled]);

  if (!currentConversation) {
    return <div className="flex-1 overflow-y-auto p-4">No conversation selected</div>;
  }

  // Find the last assistant message index to display total credits
  const lastAssistantIndex = currentConversation.messages
    .map((msg, index) => ({ role: msg.role, index }))
    .filter(item => item.role === 'assistant')
    .pop()?.index;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      {currentConversation.messages.length === 0 && !isLoading ? (
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
              {message.role === 'assistant' && message.fileSearchResults && message.fileSearchResults.length > 0 && (
                <div className="ml-12 mt-1 flex items-center text-xs text-muted-foreground">
                  <FileText size={12} className="mr-1" />
                  <span>File analysis was used to generate this response</span>
                </div>
              )}
            </div>
          ))}
          
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

export default ChatMessages;
