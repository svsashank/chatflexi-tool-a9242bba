
import { v4 as uuidv4 } from 'uuid';
import { ChatStore } from '../types';
import { AIModel } from '@/types';

export const createSendMessageAction = (
  set: (state: Partial<ChatStore>) => void,
  get: () => ChatStore
) => {
  return (content: string, images: string[] = [], files: string[] = []) => {
    const { currentConversationId, conversations, selectedModel, generateResponse } = get();
    
    if (!currentConversationId) return;
    
    const userId = localStorage.getItem('userId') || undefined;
    
    const timestamp = new Date();
    const messageId = uuidv4();
    
    // Process files to check for PDF extractions
    const processedFiles = files.map(file => {
      // If this is a PDF extraction (marked with our special prefix), extract any images
      if (file.includes("PDF_EXTRACTION:")) {
        try {
          const startIndex = file.indexOf("PDF_EXTRACTION:");
          const pdfDataJson = file.substring(startIndex + 15);
          const pdfData = JSON.parse(pdfDataJson);
          
          // Note: With pdf.js implementation, we don't get actual image data
          // We just know if images are present but don't have the actual image data to display
          console.log("PDF data processed:", pdfData.filename, "Pages:", pdfData.pages);
        } catch (error) {
          console.error("Error processing PDF extraction data:", error);
        }
      }
      return file;
    });
    
    // Add user message
    set({
      conversations: conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: messageId,
                content,
                role: 'user',
                model: selectedModel, // Include selected model info
                timestamp,
                images, // Include any attached images
                files: processedFiles   // Include any attached files
              }
            ],
            updatedAt: timestamp
          };
        }
        return conv;
      })
    });
    
    // Add a slight delay before generating the AI response to improve UX
    setTimeout(() => {
      // Generate AI response
      generateResponse();
    }, 100);
  };
};
