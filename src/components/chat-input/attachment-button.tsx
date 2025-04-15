
import React, { useRef } from "react";
import { Paperclip, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useChatStore } from "@/store";

interface AttachmentButtonProps {
  showAttachments: boolean;
  setShowAttachments: (show: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled: boolean;
  attachmentMenuRef: React.RefObject<HTMLDivElement>;
}

export const AttachmentButton = ({
  showAttachments,
  setShowAttachments,
  handleImageUpload,
  handleFileUpload,
  isDisabled,
  attachmentMenuRef,
}: AttachmentButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const { selectedModel } = useChatStore();

  const handleImageButtonClick = () => {
    if (!selectedModel.capabilities.includes('images')) {
      toast.error(`${selectedModel.name} does not support image analysis. Please select a model with vision capabilities.`);
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full hover:bg-accent ml-1"
        onClick={() => setShowAttachments(!showAttachments)}
        disabled={isDisabled}
      >
        <Paperclip size={18} className={`${showAttachments ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`} />
      </Button>
      
      {showAttachments && (
        <div 
          ref={attachmentMenuRef}
          className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 bg-popover rounded-lg border border-border shadow-md p-2 min-w-[120px] z-20"
        >
          <Button
            type="button"
            variant="ghost"
            className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
            onClick={handleImageButtonClick}
            disabled={isDisabled}
          >
            <Image size={16} className="text-primary" /> Images
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
            onClick={() => documentInputRef.current?.click()}
            disabled={isDisabled}
          >
            <FileText size={16} className="text-primary" /> Documents
          </Button>
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
        multiple
        disabled={isDisabled}
      />
      
      <input 
        type="file" 
        ref={documentInputRef}
        onChange={handleFileUpload}
        accept=".txt,.pdf,.doc,.docx,.csv,.json,.html,.css,.js"
        className="hidden"
        multiple
        disabled={isDisabled}
      />
    </div>
  );
};
