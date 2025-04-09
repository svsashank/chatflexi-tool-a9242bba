
import React, { useState } from "react";
import { Message } from "../types";
import { Bot, Check, Copy, User, Zap, Cpu, Globe, FileText } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { toast } from "sonner";
import ComputeCredits from "./ComputeCredits";
import UserComputeCredits from "./UserComputeCredits";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

interface MessageItemProps {
  message: Message;
  showTotalCredits?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showTotalCredits = false }) => {
  const [copied, setCopied] = useState(false);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);

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
  const hasWebSearchResults = message.webSearchResults && message.webSearchResults.length > 0;
  const hasFileSearchResults = message.fileSearchResults && message.fileSearchResults.length > 0;
  
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

          {/* Display attached images if any */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {message.images.map((image, index) => (
                <div key={index} className="relative rounded-md overflow-hidden border border-border">
                  <img 
                    src={image} 
                    alt={`Uploaded image ${index + 1}`} 
                    className="max-h-60 max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Display attached files if any */}
          {message.files && message.files.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="text-xs text-muted-foreground mb-1">Attached files:</div>
              {message.files.map((file, index) => {
                const fileName = file.split('\n')[0].replace('File: ', '');
                return (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="text-xs">{fileName}</span>
                  </div>
                );
              })}
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
          
          {/* Web Search Results */}
          {hasWebSearchResults && !isUserMessage && (
            <Collapsible
              open={isWebSearchOpen}
              onOpenChange={setIsWebSearchOpen}
              className="mt-4 border-t border-border pt-2"
            >
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Globe size={14} />
                <span>Web search results ({message.webSearchResults!.length})</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transform transition-transform ${
                    isWebSearchOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M6 8.5L2 4.5H10L6 8.5Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm">
                <div className="space-y-2">
                  {message.webSearchResults!.map((result, index) => (
                    <div key={index} className="p-2 bg-background rounded border border-border">
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-xs text-muted-foreground">{result.url}</p>
                      <p className="text-xs mt-1">{result.snippet}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* File Search Results */}
          {hasFileSearchResults && !isUserMessage && (
            <Collapsible
              open={isFileSearchOpen}
              onOpenChange={setIsFileSearchOpen}
              className="mt-4 border-t border-border pt-2"
            >
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <FileText size={14} />
                <span>File search results ({message.fileSearchResults!.length})</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transform transition-transform ${
                    isFileSearchOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M6 8.5L2 4.5H10L6 8.5Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm">
                <div className="space-y-2">
                  {message.fileSearchResults!.map((result, index) => (
                    <div key={index} className="p-2 bg-background rounded border border-border">
                      <h4 className="font-medium">{result.filename || 'File'}</h4>
                      <p className="text-xs mt-1">{result.content || result.snippet}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
