
import { useState, useRef, useCallback } from "react";
import { useChatStore } from "@/store";
import { v4 as uuidv4 } from "uuid";
import { extractURLsFromText } from "@/utils/urlUtils";
import { useNavigate } from "react-router-dom";

export const useInputLogic = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; file: File; dataUrl: string }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; file: File; name: string; size: string }>>([]);
  const [processingFile, setProcessingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  
  const { 
    sendMessage, 
    isLoading, 
    processingUrls, 
    setProcessingUrls
  } = useChatStore();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || !inputValue.trim()) return;
    
    try {
      // Extract URLs from input if any
      const urls = extractURLsFromText(inputValue);
      
      if (urls.length > 0) {
        setProcessingUrls(`Processing ${urls.length} URL${urls.length > 1 ? 's' : ''}...`);
      }
      
      await sendMessage(inputValue, uploadedImages.map(img => img.file), uploadedFiles.map(file => file.file));
      
      setInputValue("");
      setUploadedImages([]);
      setUploadedFiles([]);
      setShowAttachments(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [inputValue, isLoading, sendMessage, setProcessingUrls, uploadedFiles, uploadedImages]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newImages = Array.from(e.target.files).map(file => {
      const reader = new FileReader();
      const id = uuidv4();
      
      reader.onload = (e) => {
        setUploadedImages(prev => [
          ...prev,
          { id, file, dataUrl: e.target?.result as string }
        ]);
      };
      
      reader.readAsDataURL(file);
      return { id, file, dataUrl: '' }; // Placeholder until loaded
    });
    
    // Clear the input value so the same file can be selected again
    e.target.value = '';
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    setProcessingFile(true);
    
    try {
      const newFiles = Array.from(e.target.files).map(file => {
        const id = uuidv4();
        const sizeInKB = file.size / 1024;
        let sizeStr = '';
        
        if (sizeInKB < 1024) {
          sizeStr = `${Math.round(sizeInKB * 10) / 10} KB`;
        } else {
          sizeStr = `${Math.round((sizeInKB / 1024) * 10) / 10} MB`;
        }
        
        return { id, file, name: file.name, size: sizeStr };
      });
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setProcessingFile(false);
      // Clear the input value so the same file can be selected again
      e.target.value = '';
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }, []);
  
  const openImageGenerator = useCallback(() => {
    navigate('/image-generation');
  }, [navigate]);

  const isDisabled = isLoading || processingFile || (inputValue.trim() === '' && uploadedImages.length === 0 && uploadedFiles.length === 0);

  return {
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
  };
};
