
import React from "react";
import { useInputLogic } from "./use-input-logic";
import { ModelSelector } from "./model-selector";
import { MediaPreview } from "./media-preview";
import { AttachmentButton } from "./attachment-button";
import { SendButton } from "./send-button";
import { StatusMessage } from "./status-message";
import { ProcessingIndicator } from "./processing-indicator";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { Cpu } from "lucide-react";

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
    isLoading,
    processingUrls,
    estimatedCost,
    handleSubmit,
    handleKeyDown,
    handleImageUpload,
    handleFileUpload,
    removeImage,
    removeFile,
    isDisabled
  } = useInputLogic();

  return (
    <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
      <StatusMessage message={processingUrls} />
      
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-3">
          <ModelSelector />
          
          {estimatedCost !== null && (
            <div className="absolute right-5 text-xs text-muted-foreground flex items-center gap-1">
              <Cpu size={12} className="text-cyan-400" />
              <span>Est: ~{estimatedCost.toFixed(1)} CR</span>
            </div>
          )}
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
              />
              
              <AutoResizeTextarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploadedImages.length > 0 ? "Ask about these images..." : (uploadedFiles.length > 0 ? "Ask about these files..." : "Message...")}
                disabled={isLoading || processingFile}
              />
            </div>
            
            <div className="flex items-center pr-2">
              <SendButton isDisabled={isDisabled} />
            </div>
          </div>
        </form>
      </div>
      
      <ProcessingIndicator isLoading={isLoading} processingUrls={processingUrls} />
    </div>
  );
};

export default ChatInput;
