
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';
import UsageDisplay from './UsageDisplay';
import { User, Hexagon } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

const MessageItem = ({ message }: MessageItemProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-start' : 'justify-start'}`}>
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center">
        {isUser ? (
          <div className="bg-muted flex items-center justify-center w-full h-full rounded-full">
            <User size={18} className="text-foreground" />
          </div>
        ) : (
          <div className="bg-primary/20 flex items-center justify-center w-full h-full rounded-full">
            <div className="relative">
              <Hexagon size={18} className="text-primary" fill="#9b87f5" stroke="#7E69AB" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs font-bold text-white">K</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className={`flex-1 p-4 rounded-lg ${isUser ? 'bg-muted/80' : 'glass-morphism'}`}>
        <div className="prose dark:prose-invert w-full max-w-none">
          <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ node, ...props }) => (
                <div className="relative group">
                  <pre {...props} className="p-2 rounded bg-muted/80 overflow-auto" />
                </div>
              ),
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <code {...props} className={className}>
                    {children}
                  </code>
                ) : (
                  <code {...props} className="px-1 py-0.5 rounded bg-muted font-mono text-sm">
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* Display usage information if available */}
        {message.metadata?.usageDisplay && (
          <UsageDisplay usageText={message.metadata.usageDisplay} />
        )}
      </div>
    </div>
  );
};

export default MessageItem;
