import React, { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Image, X, FileText } from "lucide-react";
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

const ChatInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [processingFile, setProcessingFile] = useState(false);
  const { sendMessage, isLoading, selectedModel, setSelectedModel } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setProcessingFile(true);
    toast.info("Processing documents. Please wait...");

    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 10MB limit.`);
        failCount++;
        continue;
      }

      try {
        if (file.type === 'application/pdf') {
          toast.info(`Extracting text from PDF: ${file.name}...`);
          
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
            toast.success(`Successfully extracted text from ${file.name}`);
            successCount++;
          } else {
            toast.error(`No text content found in ${file.name}`);
            failCount++;
          }
        } else if (file.type.startsWith('text/')) {
          const textContent = await file.text();
          const fileData = `File: ${file.name}\nContent: ${textContent.substring(0, 100000)}${textContent.length > 100000 ? '...(content truncated)' : ''}`;
          console.log("Adding text file content:", fileData.substring(0, 100) + '...');
          setUploadedFiles(prev => [...prev, fileData]);
          toast.success(`File ${file.name} uploaded successfully`);
          successCount++;
        } else {
          toast.warning(`File type ${file.type} content cannot be extracted. Only the filename will be used.`);
          setUploadedFiles(prev => [...prev, `File: ${file.name} (Binary content type: ${file.type})`]);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        toast.error(`Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} file(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to process ${failCount} file(s)`);
    }

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
    setProcessingFile(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 border-t border-border bg-background/90 backdrop-blur-sm sticky bottom-0 z-10">
      <form 
        onSubmit={handleSubmit} 
        className="relative flex flex-col gap-3 max-w-3xl mx-auto"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="self-center flex items-center justify-center h-10 gap-2 px-4 rounded-lg border border-primary/20 bg-background hover:bg-accent"
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

        {uploadedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {uploadedFiles.map((file, index) => {
              const fileName = file.split('\n')[0].replace('File: ', '');
              return (
                <div key={index} className="relative flex items-center gap-1 px-3 py-2 rounded-md border border-border bg-muted/30">
                  <FileText size={14} className="text-muted-foreground" />
                  <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative flex-1 bg-muted/50 rounded-lg overflow-hidden">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploadedImages.length > 0 ? "Ask about this image..." : (uploadedFiles.length > 0 ? "Ask about these files..." : "Message...")}
              disabled={isLoading || processingFile}
              className="w-full max-h-[200px] resize-none bg-transparent border-0 py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              rows={1}
            />
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
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || processingFile}
            title="Upload images"
          >
            <Image size={18} />
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => documentInputRef.current?.click()}
            disabled={isLoading || processingFile}
            title="Upload document files"
          >
            <FileText size={18} />
          </Button>
          
          <Button
            type="submit"
            disabled={(inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || processingFile}
            variant={(inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || processingFile ? "secondary" : "default"}
            size="icon"
            className="h-10 w-10"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
