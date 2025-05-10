
import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, FileText, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AttachmentButtonProps {
  showAttachments: boolean;
  setShowAttachments: (value: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled: boolean;
  attachmentMenuRef: React.RefObject<HTMLDivElement>;
  openImageGenerator: () => void;
}

export const AttachmentButton = ({
  showAttachments,
  setShowAttachments,
  handleImageUpload,
  handleFileUpload,
  isDisabled,
  attachmentMenuRef,
  openImageGenerator
}: AttachmentButtonProps) => {
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
          className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 bg-popover rounded-lg border border-border shadow-md p-2 min-w-[140px] z-20"
        >
          <Button
            type="button"
            variant="ghost"
            className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={isDisabled}
          >
            <Image size={16} className="text-primary" /> Upload Images
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isDisabled}
          >
            <FileText size={16} className="text-primary" /> Upload Files
          </Button>
          
          <Button
            type="button"
            variant="ghost" 
            className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
            onClick={() => {
              openImageGenerator();
              setShowAttachments(false);
            }}
          >
            <ImagePlus size={16} className="text-primary" /> Generate Image
          </Button>
        </div>
      )}
    </div>
  );
};
