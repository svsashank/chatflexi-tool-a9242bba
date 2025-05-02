import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store';
import { toast } from 'sonner';
import { extractTextFromPDF } from '@/utils/pdfExtractor';
import { AIModelCapability } from '@/types';

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
    if (!files) return;

    setProcessingFile(true);
    setProcessingUrls("Processing documents. Please wait...");

    let successCount = 0;
    let failCount = 0;

    const filesToProcess = Array.from(files).filter(file => {
      if (file.size > 25 * 1024 * 1024) {
        toast.warning(`File ${file.name} exceeds 25MB limit.`);
        failCount++;
        return false;
      }
      
      if (processingFiles.has(file.name + file.size)) {
        return false;
      }
      processingFiles.add(file.name + file.size);
      return true;
    });

    try {
      await Promise.all(filesToProcess.map(async (file) => {
        try {
          let fileContent = '';

          if (file.type === 'application/pdf') {
            setProcessingUrls(`Extracting text from PDF: ${file.name}...`);
            fileContent = await extractTextFromPDF(file);
          } else if (file.type.startsWith('text/')) {
            fileContent = await file.text();
          }

          if (fileContent) {
            const fileData = `File: ${file.name}\nContent: ${fileContent}`;
            setUploadedFiles(prev => [...prev, fileData]);
            successCount++;
          } else {
            setUploadedFiles(prev => [...prev, `File: ${file.name} (Binary content type: ${file.type})`]);
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          failCount++;
        } finally {
          processingFiles.delete(file.name + file.size);
        }
      }));
    } finally {
      if (successCount > 0) {
        setProcessingUrls(`Successfully processed ${successCount} file(s)`);
      }
      if (failCount > 0) {
        setProcessingUrls(`Failed to process ${failCount} file(s)`);
      }
      
      setTimeout(() => setProcessingUrls(null), 2000);
      setProcessingFile(false);
      setShowAttachments(false);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
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
