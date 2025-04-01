
import React, { useEffect, useRef } from "react";
import useChatStore from "@/store/chatStore";
import MessageItem from "./MessageItem";
import { Bot, User } from "lucide-react";

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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {currentConversation.messages.length === 0 && !isLoading ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
          <div className="flex gap-2 mb-4">
            {[
              { icon: <User size={24} />, color: 'bg-muted' },
              { icon: <Bot size={24} />, color: 'bg-primary/20' }
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
          {currentConversation.messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="flex-1 p-4 rounded-lg glass-morphism">
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-slow"
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
