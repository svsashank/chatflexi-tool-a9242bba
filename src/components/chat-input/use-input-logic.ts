
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import { toast } from 'sonner';
import { extractTextFromPDF } from '@/utils/pdfExtractor';

export const useInputLogic = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [processingFile, setProcessingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  
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

    e.target.value = '';
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

    e.target.value = '';
    
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

  return {
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
    handleSubmit,
    handleKeyDown,
    handleImageUpload,
    handleFileUpload,
    removeImage,
    removeFile,
    isDisabled
  };
};
