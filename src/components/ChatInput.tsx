import React, { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Image, FileText, Paperclip, X } from "lucide-react";
import { useChatStore } from "@/store";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AI_MODELS } from "@/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { Textarea } from "@/components/ui/textarea";
import { AIModelCapability } from "@/types";

const ChatInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [processingFile, setProcessingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const { 
    sendMessage, 
    isLoading, 
    selectedModel, 
    setSelectedModel, 
    setProcessingUrls, 
    processingUrls 
  } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachments(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || uploadedImages.length > 0 || uploadedFiles.length > 0) && !isLoading && !processingFile) {
      let messageContent = inputValue.trim();
      
      if (!messageContent && uploadedFiles.length > 0) {
        messageContent = "Please analyze and summarize the content of these document(s)";
      }
      
      console.log("Submitting message with:", {
        content: messageContent,
        images: uploadedImages.length,
        files: uploadedFiles.length,
        filePreview: uploadedFiles.length > 0 ? uploadedFiles[0].substring(0, 50) + '...' : 'none'
      });
      
      sendMessage(
        messageContent, 
        uploadedImages.length > 0 ? uploadedImages : undefined,
        uploadedFiles.length > 0 ? uploadedFiles : undefined
      );
      setInputValue("");
      setUploadedImages([]);
      setUploadedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fix the type issue by checking for 'images' capability
    if (!selectedModel.capabilities.includes('images')) {
      toast.error(`${selectedModel.name} does not support image analysis. Please select a model with vision capabilities.`);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`);
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        toast.error(`Image ${file.name} exceeds 4MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedImages(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowAttachments(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setProcessingFile(true);
    setProcessingUrls("Processing documents. Please wait...");

    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setProcessingUrls(`File ${file.name} exceeds 10MB limit.`);
        failCount++;
        continue;
      }

      try {
        if (file.type === 'application/pdf') {
          setProcessingUrls(`Extracting text from PDF: ${file.name}...`);
          
          let pdfText = "";
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              pdfText = await extractTextFromPDF(file);
              break;
            } catch (pdfError) {
              console.error(`PDF extraction attempt ${attempts} failed:`, pdfError);
              if (attempts >= maxAttempts) throw pdfError;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (pdfText.trim()) {
            const fileContent = `File: ${file.name}\nContent: ${pdfText.substring(0, 100000)}${pdfText.length > 100000 ? '...(content truncated)' : ''}`;
            console.log("Adding extracted PDF text to uploaded files:", fileContent.substring(0, 100) + '...');
            setUploadedFiles(prev => [...prev, fileContent]);
            setProcessingUrls(`Successfully extracted text from ${file.name}`);
            successCount++;
          } else {
            setProcessingUrls(`No text content found in ${file.name}`);
            failCount++;
          }
        } else if (file.type.startsWith('text/')) {
          const textContent = await file.text();
          const fileData = `File: ${file.name}\nContent: ${textContent.substring(0, 100000)}${textContent.length > 100000 ? '...(content truncated)' : ''}`;
          console.log("Adding text file content:", fileData.substring(0, 100) + '...');
          setUploadedFiles(prev => [...prev, fileData]);
          setProcessingUrls(`File ${file.name} uploaded successfully`);
          successCount++;
        } else {
          setProcessingUrls(`File type ${file.type} content cannot be extracted. Only the filename will be used.`);
          setUploadedFiles(prev => [...prev, `File: ${file.name} (Binary content type: ${file.type})`]);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        setProcessingUrls(`Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
      }
    }

    if (successCount > 0) {
      setProcessingUrls(`Successfully processed ${successCount} file(s)`);
    }
    if (failCount > 0) {
      setProcessingUrls(`Failed to process ${failCount} file(s)`);
    }

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
    
    setTimeout(() => setProcessingUrls(null), 2000);
    setProcessingFile(false);
    setShowAttachments(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isDisabled = (inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || processingFile;

  return (
    <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
      {processingUrls && (
        <div className="text-center text-sm py-2 px-3 mb-3 bg-primary/10 text-primary rounded-md flex items-center justify-center">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/60 mr-2 animate-pulse"></span>
          {processingUrls}
        </div>
      )}
      
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center justify-center h-9 gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-background hover:bg-accent transition-all"
                aria-label="Select AI model"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: selectedModel.avatarColor }}
                />
                <span className="text-sm font-medium">
                  {selectedModel.name}
                  <span className="text-xs ml-1.5 text-muted-foreground hidden sm:inline">
                    ({selectedModel.provider})
                  </span>
                </span>
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64 mt-1 border-primary/20">
              <DropdownMenuLabel className="text-center">Choose an AI Model</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-80">
                <div className="p-1">
                  {AI_MODELS.map((model) => (
                    <DropdownMenuItem 
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className="flex items-center gap-2 cursor-pointer py-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: model.avatarColor }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.provider}</span>
                      </div>
                      {model.capabilities.includes('images') && (
                        <span className="text-xs ml-auto px-1.5 py-0.5 bg-primary/10 text-primary rounded">Vision</span>
                      )}
                      {selectedModel.id === model.id && (
                        <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
          {(uploadedImages.length > 0 || uploadedFiles.length > 0) && (
            <div className="bg-muted/30 p-3 rounded-t-xl border border-border border-b-0">
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border border-border group hover:shadow-md transition-all">
                      <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} className="text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => {
                    const fileName = file.split('\n')[0].replace('File: ', '');
                    return (
                      <div 
                        key={index} 
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background/50 group hover:bg-background/80 transition-all"
                      >
                        <FileText size={14} className="text-primary" />
                        <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-1 rounded-full p-1 hover:bg-muted"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div 
            className={`flex relative border ${(uploadedImages.length > 0 || uploadedFiles.length > 0) ? 'rounded-t-none rounded-b-full' : 'rounded-full'} bg-background/30 focus-within:border-primary/50 transition-all`}
          >
            <div className="flex-grow flex items-center">
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-accent ml-1"
                  onClick={() => setShowAttachments(!showAttachments)}
                  disabled={isLoading || processingFile}
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || processingFile}
                    >
                      <Image size={16} className="text-primary" /> Images
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex items-center justify-start gap-2 h-9 px-2 py-2 rounded-md hover:bg-accent text-sm"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={isLoading || processingFile}
                    >
                      <FileText size={16} className="text-primary" /> Documents
                    </Button>
                  </div>
                )}
              </div>
              
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploadedImages.length > 0 ? "Ask about these images..." : (uploadedFiles.length > 0 ? "Ask about these files..." : "Message...")}
                disabled={isLoading || processingFile}
                className="min-h-[48px] max-h-[200px] resize-none bg-transparent border-0 py-3 px-2 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
            </div>
            
            <div className="flex items-center pr-2">
              <Button
                type="submit"
                disabled={isDisabled}
                variant={isDisabled ? "ghost" : "default"}
                size="icon"
                className={`h-9 w-9 rounded-full transition-all ${isDisabled ? 'opacity-50' : ''}`}
              >
                <Send size={18} className={isDisabled ? 'text-muted-foreground' : 'text-primary-foreground'} />
              </Button>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            multiple
            disabled={isLoading || processingFile}
          />
          
          <input 
            type="file" 
            ref={documentInputRef}
            onChange={handleFileUpload}
            accept=".txt,.pdf,.doc,.docx,.csv,.json,.html,.css,.js"
            className="hidden"
            multiple
            disabled={isLoading || processingFile}
          />
        </form>
      </div>
      
      {isLoading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse"></div>
          <span>{processingUrls || "Processing your request..."}</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
