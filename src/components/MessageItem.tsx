
import React, { useState } from "react";
import { Message } from "../types";
import { Bot, Check, Copy, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { toast } from "sonner";

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text");
    }
  };

  const isUserMessage = message.role === "user";
  
  return (
    <div className={`flex items-start gap-4 animate-fade-in ${isUserMessage ? "" : "group"}`}>
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUserMessage ? "bg-muted" : "bg-primary/20"
        }`}
      >
        {isUserMessage ? (
          <User size={18} />
        ) : (
          <div className="flex items-center justify-center">
            <Bot size={18} />
          </div>
        )}
      </div>
      
      <div 
        className={`flex-1 p-4 rounded-lg ${
          isUserMessage 
            ? "bg-muted/30 text-foreground" 
            : "glass-morphism"
        }`}
      >
        {!isUserMessage && (
          <div className="flex items-center mb-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full mr-2" 
              style={{ backgroundColor: message.model.avatarColor }}
            />
            <span className="text-xs font-medium">{message.model.name}</span>
          </div>
        )}
        
        <div className="chat-message">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const inline = !match && !className;
                
                if (inline) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="code-block relative group">
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-1 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <pre className="overflow-auto">
                      <code className={className}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
      
      {!isUserMessage && (
        <button
          onClick={copyToClipboard}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy response"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
};

export default MessageItem;
