
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Updated CORS headers to be more permissive
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',  // More permissive to allow all headers
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// We'll use Mozilla's PDF.js for PDF parsing via CDN
const pdfJsUrl = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js";
const pdfJsWorkerUrl = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// Simple text extraction from a PDF using PDF.js
async function extractPDFText(pdfArrayBuffer) {
  try {
    // Load PDF.js dynamically
    const pdfJsModule = await import(pdfJsUrl);
    const pdfjsLib = pdfJsModule.default;
    
    // Configure the PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfJsWorkerUrl;
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
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
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
      
      // Check for images by looking at the operatorList
      const operatorList = await page.getOperatorList();
      if (operatorList.fnArray.some(op => op === pdfjsLib.OPS.paintImageXObject)) {
        hasImages = true;
        console.log(`Found images on page ${i}`);
      }
    }
    
    return {
      text: fullText || "No text could be extracted from this PDF.",
      images: hasImages ? ["PDF contains images, but direct extraction is not supported in this version."] : [],
      pages: numPages
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

serve(async (req) => {
  console.log("PDF extraction function called");
  
  // Handle CORS preflight requests with proper response
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    console.log("Processing PDF extraction request");
    
    // Check if the request is properly formatted
    if (!req.body) {
      console.error("Request has no body");
      return new Response(
        JSON.stringify({ error: 'Invalid request: No request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error("Failed to parse form data:", formError);
      return new Response(
        JSON.stringify({ error: `Invalid form data: ${formError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    // Extract text and detect images from the PDF
    const extractionResult = await extractPDFText(arrayBuffer);
    
    console.log("PDF processing complete");
    
    // Return the extracted content
    return new Response(
      JSON.stringify({
        text: extractionResult.text,
        images: extractionResult.images,
        pages: extractionResult.pages,
        filename: file.name
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: `PDF extraction error: ${error.message || 'Unknown error'}`,
        details: String(error)
      }),
      { 
        status: 200, // Return 200 instead of 500 to prevent CORS issues but with error in body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
