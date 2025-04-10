
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
  try {
    const textContent = await page.getTextContent();
    return textContent.items
      .map(item => item.str)
      .join(' ');
  } catch (error) {
    console.error('Error extracting text from page:', error);
    return '';
  }
}

// Function to check for images in a PDF page
async function checkForImagesInPage(page) {
  try {
    const operatorList = await page.getOperatorList();
    // Check if there are any image operators in the page
    return operatorList.fnArray.some(op => op === PDFJS.OPS.paintImageXObject);
  } catch (error) {
    console.error('Error checking for images in page:', error);
    return false;
  }
}

serve(async (req) => {
  console.log("PDF extraction function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing PDF extraction request");
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      console.error("No PDF file provided in request");
      return new Response(
        JSON.stringify({ error: 'No PDF file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      console.error("File is not a PDF:", file.name, file.type);
      return new Response(
        JSON.stringify({ error: 'File is not a PDF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);
    
    // Convert the file to an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    console.log("Loading PDF document with pdf.js");
    const loadingTask = PDFJS.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const numPages = pdf.numPages;
    console.log(`PDF has ${numPages} pages`);
    
    let fullText = '';
    let hasImages = false;
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      console.log(`Processing page ${i}/${numPages}`);
      const page = await pdf.getPage(i);
      
      // Extract text
      const pageText = await extractTextFromPage(page);
      fullText += pageText + '\n\n';
      
      // Check for images
      const pageHasImages = await checkForImagesInPage(page);
      if (pageHasImages) {
        hasImages = true;
        console.log(`Found images on page ${i}`);
      }
    }
    
    console.log("PDF processing complete");
    
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
