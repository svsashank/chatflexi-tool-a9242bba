
import React, { useEffect, useRef } from "react";
import { useChatStore } from "@/store";
import MessageItem from "./MessageItem";
import { User, Hexagon } from "lucide-react";

const ChatMessages = () => {
  const { conversations, currentConversationId, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  // Scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, isLoading]);

  if (!currentConversation) {
    return <div className="flex-1 overflow-y-auto p-4">No conversation selected</div>;
  }

  // Find the last assistant message index to display total credits
  const lastAssistantIndex = currentConversation.messages
    .map((msg, index) => ({ role: msg.role, index }))
    .filter(item => item.role === 'assistant')
    .pop()?.index;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
            <MessageItem 
              key={message.id} 
              message={message} 
              showTotalCredits={index === lastAssistantIndex}
            />
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
