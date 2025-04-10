
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// Import pdf.js for PDF parsing
import * as pdfjs from "https://cdn.skypack.dev/pdfjs-dist@2.16.105/build/pdf.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Configure the PDF.js worker
const PDFJS = pdfjs;
PDFJS.GlobalWorkerOptions.workerSrc = "https://cdn.skypack.dev/pdfjs-dist@2.16.105/build/pdf.worker.min.js";

// Function to extract text from a PDF page
async function extractTextFromPage(page) {
  const textContent = await page.getTextContent();
  return textContent.items
    .map(item => item.str)
    .join(' ');
}

// Function to extract images from a PDF page (basic implementation)
async function extractImagesFromPage(page) {
  const operatorList = await page.getOperatorList();
  const images = [];
  
  // This is a simplified approach - in production you might want to use a more robust method
  for (const op of operatorList.fnArray) {
    if (op === PDFJS.OPS.paintImageXObject) {
      // We found an image, but extraction is complex
      // For now, we'll just note that images exist
      images.push(true);
    }
  }
  
  return images.length > 0;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No PDF file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'File is not a PDF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert the file to an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = PDFJS.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const numPages = pdf.numPages;
    let fullText = '';
    let hasImages = false;
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract text
      const pageText = await extractTextFromPage(page);
      fullText += pageText + '\n\n';
      
      // Check for images
      const pageHasImages = await extractImagesFromPage(page);
      if (pageHasImages) {
        hasImages = true;
      }
    }
    
    // Return the extracted content
    return new Response(
      JSON.stringify({
        text: fullText || "No text could be extracted from this PDF.",
        images: hasImages ? ["PDF contains images, but direct extraction is not supported in this version."] : [],
        pages: numPages,
        filename: file.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PDF extraction error:', error);
    return new Response(
      JSON.stringify({ error: `PDF extraction error: ${error.message || 'Unknown error'}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
