
import React from "react";
import { useInputLogic } from "@/components/chat-input/use-input-logic";
import { ModelSelector } from "@/components/chat-input/model-selector";
import { MediaPreview } from "@/components/chat-input/media-preview";
import { AttachmentButton } from "@/components/chat-input/attachment-button";
import { SendButton } from "@/components/chat-input/send-button";
import { StatusMessage } from "@/components/chat-input/status-message";
import { ProcessingIndicator } from "@/components/chat-input/processing-indicator";
import { AutoResizeTextarea } from "@/components/chat-input/auto-resize-textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";

const ChatInput = () => {
  const {
    inputValue,
    setInputValue,
    uploadedImages,
    uploadedFiles,
    processingFile,
    showAttachments,
    setShowAttachments,
    attachmentMenuRef,
    imageInputRef,
    fileInputRef,
    isLoading,
    processingUrls,
    handleSubmit,
    handleKeyDown,
    handleImageUpload,
    handleFileUpload,
    removeImage,
    removeFile,
    isDisabled,
    openImageGenerator
  } = useInputLogic();

  return (
    <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
      <StatusMessage message={processingUrls} />
      
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-3">
          <ModelSelector />
        </div>
        
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
          <MediaPreview 
            uploadedImages={uploadedImages}
            uploadedFiles={uploadedFiles}
            removeImage={removeImage}
            removeFile={removeFile}
          />

          <div 
            className={`flex relative border ${(uploadedImages.length > 0 || uploadedFiles.length > 0) ? 'rounded-t-none rounded-b-full' : 'rounded-full'} bg-background/30 focus-within:border-primary/50 transition-all`}
          >
            <div className="flex-grow flex items-center">
              <AttachmentButton 
                showAttachments={showAttachments}
                setShowAttachments={setShowAttachments}
                handleImageUpload={handleImageUpload}
                handleFileUpload={handleFileUpload}
                isDisabled={isLoading || processingFile}
                attachmentMenuRef={attachmentMenuRef}
                openImageGenerator={openImageGenerator}
              />
              
              <AutoResizeTextarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploadedImages.length > 0 ? "Ask about these images..." : (uploadedFiles.length > 0 ? "Ask about these files..." : "Message...")}
                disabled={isLoading || processingFile}
              />
            </div>
            
            <div className="flex items-center pr-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                title="Generate Images"
                onClick={openImageGenerator}
              >
                <ImageIcon size={18} className="text-muted-foreground hover:text-primary transition-colors" />
              </Button>
              <SendButton isDisabled={isDisabled} />
            </div>
          </div>
          
          <input 
            id="image-upload"
            type="file" 
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            multiple
            disabled={isLoading || processingFile}
          />
          
          <input 
            id="file-upload"
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.pdf,.doc,.docx,.csv,.json,.html,.css,.js"
            className="hidden"
            multiple
            disabled={isLoading || processingFile}
          />
        </form>
      </div>
      
      <ProcessingIndicator isLoading={isLoading} processingUrls={processingUrls} />
    </div>
  );
};

export default ChatInput;
