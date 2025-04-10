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
import { supabase } from "@/integrations/supabase/client";

const ChatInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
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
    if ((inputValue.trim() || uploadedImages.length > 0 || uploadedFiles.length > 0) && !isLoading && !isProcessingPdf) {
      sendMessage(
        inputValue.trim(), 
        uploadedImages.length > 0 ? uploadedImages : undefined,
        uploadedFiles.length > 0 ? uploadedFiles : undefined
      );
      setInputValue("");
      setUploadedImages([]);
      setUploadedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } else if (isProcessingPdf) {
      toast.error("Please wait while PDF is being processed");
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

  const processPdfFile = async (file: File): Promise<string> => {
    try {
      setIsProcessingPdf(true);
      toast.info(`Extracting content from PDF: ${file.name}`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log(`Sending PDF ${file.name} to extract-pdf function`);
      
      const { data, error } = await supabase.functions.invoke('extract-pdf', {
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (error) {
        console.error('PDF extraction error:', error);
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
      
      if (!data) {
        console.error('No data returned from PDF extraction');
        throw new Error("No data returned from PDF extraction");
      }
      
      console.log('PDF extraction successful:', {
        filename: data.filename,
        pages: data.pages,
        textLength: data.text?.length || 0,
        hasImages: data.images?.length > 0
      });
      
      return `File: ${file.name}\nContent: PDF_EXTRACTION:${JSON.stringify(data)}`;
    } catch (error) {
      console.error('PDF extraction error:', error);
      toast.error(`Failed to extract content from PDF: ${error.message || 'Unknown error'}`);
      return `File: ${file.name}\nContent: Failed to extract content from this PDF. Error: ${error.message || 'Unknown error'}`;
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 10MB limit.`);
          continue;
        }

        if (file.type === 'application/pdf') {
          console.log(`Processing PDF file: ${file.name}`);
          const extractedContent = await processPdfFile(file);
          setUploadedFiles(prev => [...prev, extractedContent]);
          
          if (!extractedContent.includes('Error:')) {
            toast.success(`PDF ${file.name} processed successfully`);
          }
          continue;
        }

        const allowedTypes = [
          'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
          'application/json', 'application/xml', 'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`File type ${file.type} is not supported.`);
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            if (file.type.startsWith('text/')) {
              setUploadedFiles(prev => [...prev, `File: ${file.name}\nContent: ${e.target?.result}`]);
            } else {
              setUploadedFiles(prev => [...prev, `File: ${file.name} (Binary content)`]);
            }
            toast.success(`File ${file.name} uploaded successfully`);
          }
        };
        
        if (file.type.startsWith('text/')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        toast.error(`Failed to process file ${file.name}: ${error.message || 'Unknown error'}`);
      }
    }

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
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
              disabled={isLoading || isProcessingPdf}
              className="w-full max-h-[200px] resize-none bg-transparent border-0 py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              rows={1}
            />
            {isProcessingPdf && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Processing PDF...</p>
                </div>
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            multiple
            disabled={isLoading || isProcessingPdf}
          />
          
          <input 
            type="file" 
            ref={documentInputRef}
            onChange={handleFileUpload}
            accept=".txt,.pdf,.doc,.docx,.csv,.json,.html,.css,.js"
            className="hidden"
            multiple
            disabled={isLoading || isProcessingPdf}
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingPdf}
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
            disabled={isLoading || isProcessingPdf}
            title="Upload document files"
          >
            <FileText size={18} />
          </Button>
          
          <Button
            type="submit"
            disabled={(inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || isProcessingPdf}
            variant={(inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || isProcessingPdf ? "secondary" : "default"}
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
