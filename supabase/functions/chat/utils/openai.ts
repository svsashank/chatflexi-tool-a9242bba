
import { corsHeaders } from "./cors.ts";

// OpenAI Stream Utility
export async function OpenAIStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  let buffer = '';
  let content = '';
  
  async function read() {
    if (!reader) {
      return encoder.encode('data: [DONE]\n\n');
    }
    
    const { value, done } = await reader.read();
    
    if (done) {
      // Return a stream end marker
      return encoder.encode('data: [DONE]\n\n');
    }
    
    // Decode the chunk and add it to our buffer
    buffer += decoder.decode(value, { stream: true });
    
    // Process any complete messages in the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep any incomplete line in the buffer
    
    const chunks = [];
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          // Stream finished
          chunks.push(encoder.encode('data: [DONE]\n\n'));
        } else {
          try {
            const json = JSON.parse(data);
            const chunk = json.choices[0]?.delta?.content || '';
            if (chunk) {
              content += chunk;
              chunks.push(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
          } catch (error) {
            console.error('Error parsing stream data:', error);
          }
        }
      }
    }
    
    return chunks.length > 0 
      ? encoder.encode(chunks.map(c => decoder.decode(c)).join(''))
      : encoder.encode('');
  }
  
  return new ReadableStream({
    async pull(controller) {
      try {
        const chunk = await read();
        if (chunk.length === 0) {
          // Wait briefly for more data
          await new Promise(resolve => setTimeout(resolve, 100));
          const nextChunk = await read();
          if (nextChunk.length > 0) {
            controller.enqueue(nextChunk);
          }
        } else {
          controller.enqueue(chunk);
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        controller.error(error);
      }
    },
    cancel() {
      reader?.cancel();
    }
  });
}

// File Processing Utility
export async function extractTextFromFile(fileContent: string): Promise<string> {
  try {
    // Check if this is a binary file (starts with "data:")
    if (fileContent.startsWith('data:')) {
      // For binary files, we can't extract text directly in an edge function
      // Return a placeholder message
      return "This appears to be a binary file. The AI can't directly read the contents, but you can ask questions about the file and the AI will do its best to assist based on the file name and type.";
    }
    
    // Extract file name and content from the format "File: filename\nContent: content"
    const fileNameMatch = fileContent.match(/^File: (.*?)(?:\n|$)/);
    const fileName = fileNameMatch ? fileNameMatch[1] : "Unknown file";
    
    // Get the content after "Content: " or use the whole string if not found
    const contentMatch = fileContent.match(/Content: ([\s\S]*)/);
    let extractedContent = contentMatch ? contentMatch[1] : fileContent;
    
    // If the content starts with "PDF_EXTRACTION:" it contains pre-extracted PDF content
    if (extractedContent.startsWith("PDF_EXTRACTION:")) {
      const pdfData = JSON.parse(extractedContent.substring(15));
      let formattedContent = `PDF Document: ${pdfData.filename}\nPages: ${pdfData.pages}\n\nExtracted Text:\n${pdfData.text}`;
      
      if (pdfData.images && pdfData.images.length > 0) {
        formattedContent += `\n\nThe document contains images that could not be directly extracted.`;
      }
      
      return formattedContent;
    }
    
    // If it's still a binary file (indicated by the filename), provide a helpful message
    if (fileName.endsWith('.pdf')) {
      return "This is a PDF file. To get better results, please use the PDF extraction feature in the client before uploading.";
    }
    
    // Return the extracted content
    return extractedContent;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    return "Error: Could not process file content. Please try uploading a plain text version of the document.";
  }
}
