
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import { toast } from 'sonner';
import { extractTextFromPDF } from '@/utils/pdfExtractor';

// Track ongoing file processes to prevent duplicate work
const processingFiles = new Set<string>();

export const useInputLogic = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [processingFile, setProcessingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    sendMessage, 
    isLoading, 
    selectedModel,
    setProcessingUrls, 
    processingUrls 
  } = useChatStore();

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
      
      sendMessage(
        messageContent, 
        uploadedImages.length > 0 ? uploadedImages : undefined,
        uploadedFiles.length > 0 ? uploadedFiles : undefined
      );
      setInputValue("");
      setUploadedImages([]);
      setUploadedFiles([]);
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

    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowAttachments(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingFile(true);
    setProcessingUrls("Processing documents. Please wait...");

    let successCount = 0;
    let failCount = 0;
    const filesToProcess = Array.from(files).filter(file => {
      // Check if we're already processing this file
      if (processingFiles.has(file.name + file.size)) {
        return false;
      }
      processingFiles.add(file.name + file.size);
      return true;
    });

    try {
      // Process files in parallel for better performance
      await Promise.all(filesToProcess.map(async (file) => {
        try {
          if (file.size > 10 * 1024 * 1024) {
            setProcessingUrls(`File ${file.name} exceeds 10MB limit.`);
            failCount++;
            return;
          }

          if (file.type === 'application/pdf') {
            setProcessingUrls(`Extracting text from PDF: ${file.name}...`);
            
            try {
              const pdfText = await extractTextFromPDF(file);
              
              if (pdfText.trim()) {
                // Truncate to avoid memory issues
                const maxLength = 100000; 
                const truncatedText = pdfText.length > maxLength ? 
                  pdfText.substring(0, maxLength) + '...(content truncated)' : 
                  pdfText;
                
                const fileContent = `File: ${file.name}\nContent: ${truncatedText}`;
                setUploadedFiles(prev => [...prev, fileContent]);
                setProcessingUrls(`Successfully extracted text from ${file.name}`);
                successCount++;
              } else {
                setProcessingUrls(`No text content found in ${file.name}`);
                failCount++;
              }
            } catch (pdfError) {
              console.error(`PDF extraction failed:`, pdfError);
              setProcessingUrls(`Error extracting text from ${file.name}: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
              failCount++;
            }
          } else if (file.type.startsWith('text/')) {
            const textContent = await file.text();
            const maxLength = 100000;
            const truncatedText = textContent.length > maxLength ? 
              textContent.substring(0, maxLength) + '...(content truncated)' : 
              textContent;
            
            const fileData = `File: ${file.name}\nContent: ${truncatedText}`;
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
          failCount++;
        } finally {
          // Remove file from processing set regardless of success/failure
          processingFiles.delete(file.name + file.size);
        }
      }));
    } finally {
      // Clear input value to allow reuploading same file
      if (imageInputRef.current) imageInputRef.current.value = '';
      
      if (successCount > 0) {
        setProcessingUrls(`Successfully processed ${successCount} file(s)`);
      }
      if (failCount > 0) {
        setProcessingUrls(`Failed to process ${failCount} file(s)`);
      }
      
      // Clear processing message after a short delay
      setTimeout(() => setProcessingUrls(null), 2000);
      setProcessingFile(false);
      setShowAttachments(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isDisabled = (inputValue.trim() === "" && uploadedImages.length === 0 && uploadedFiles.length === 0) || isLoading || processingFile;

  return {
    inputValue,
    setInputValue,
    uploadedImages,
    uploadedFiles,
    processingFile,
    showAttachments,
    setShowAttachments,
    attachmentMenuRef,
    fileInputRef,
    imageInputRef,
    isLoading,
    processingUrls,
    handleSubmit,
    handleKeyDown,
    handleImageUpload,
    handleFileUpload,
    removeImage,
    removeFile,
    isDisabled
  };
};
