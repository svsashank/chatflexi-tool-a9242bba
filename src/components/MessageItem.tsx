
import React, { useState } from "react";
import { Message } from "../types";
import { Bot, Check, Copy, User, Zap, Cpu, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { toast } from "sonner";
import ComputeCredits from "./ComputeCredits";
import UserComputeCredits from "./UserComputeCredits";

interface MessageItemProps {
  message: Message;
  showTotalCredits?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showTotalCredits = false }) => {
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

  const downloadImage = async (imageUrl: string) => {
    try {
      // Create a temporary anchor element
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `image-${new Date().getTime()}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      toast.success("Image download started");
    } catch (err) {
      toast.error("Failed to download image");
    }
  };

  const isUserMessage = message.role === "user";
  
  // Check if this is a generated image message
  const isGeneratedImageMessage = message.images && message.images.length > 0 && 
                                message.content.includes("Generated image from prompt:");
  
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
            <Zap size={18} className="text-yellow-400" />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col">
        <div 
          className={`p-4 rounded-lg ${
            isUserMessage 
              ? "bg-muted/30 text-foreground" 
              : "glass-morphism"
          }`}
        >
          {!isUserMessage && (
            <div className="mb-1.5 flex items-center">
              <div 
                className="w-2.5 h-2.5 rounded-full mr-2 animate-pulse" 
                style={{ backgroundColor: message.model.avatarColor }}
              />
              <span className="text-xs font-medium">
                {message.model.name}
              </span>
            </div>
          )}

          {/* Display attached images with download button */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {message.images.map((image, index) => (
                <div key={index} className="relative rounded-md overflow-hidden border border-border group">
                  <img 
                    src={image} 
                    alt={isGeneratedImageMessage ? "Generated image" : `Uploaded image ${index + 1}`} 
                    className="max-h-80 max-w-full object-contain"
                  />
                  <button
                    onClick={() => downloadImage(image)}
                    className="absolute top-2 right-2 p-2 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download image"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="chat-message">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
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
        
        <div className="mt-1 self-end flex items-center gap-2">
          {!isUserMessage && message.computeCredits !== undefined && message.tokens && (
            <ComputeCredits 
              credits={message.computeCredits}
              tokens={message.tokens}
              modelId={message.model.id}
            />
          )}
          
          {showTotalCredits && !isUserMessage && (
            <UserComputeCredits />
          )}
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
