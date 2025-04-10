
import * as PDFJS from 'pdfjs-dist';
import { toast } from "sonner";

// Set up the worker for PDF.js
const pdfjsWorkerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
PDFJS.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

/**
 * Extracts text from a PDF file
 * @param file The PDF file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const textItems = content.items.map((item: any) => 
        'str' in item ? item.str : ''
      );
      const pageText = textItems.join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    toast.error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
