
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { corsHeaders } from "./utils/cors.ts";
import { generateSystemPrompt } from "./utils/context.ts";
import { performBraveSearch, shouldPerformWebSearch } from "./utils/braveSearch.ts";

// Import handlers for different model providers
import { handleOpenAIStandard, handleOpenAIReasoningModel, isOSeriesReasoningModel } from "./handlers/openai.ts";
import { handleAnthropic } from "./handlers/anthropic.ts";
import { handleGoogle } from "./handlers/google.ts";
import { handleXAI } from "./handlers/xai.ts";
import { handleKrutrim } from "./handlers/krutrim.ts";

serve(async (req) => {
  // IMPORTANT: Always handle CORS for any request type
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    const { content, model, messages, images, files } = await req.json();
    
    // Prepare conversation history in the format the APIs expect
    const messageHistory = messages || [];
    // Get any images that were attached to the message
    const messageImages = images || [];
    // Get any files that were attached to the message
    const messageFiles = files || [];
    
    console.log(`Request received for provider: ${model.provider}, model: ${model.id}`);
    if (messageImages && messageImages.length > 0) {
      console.log(`Request includes ${messageImages.length} images`);
    }
    if (messageFiles && messageFiles.length > 0) {
      console.log(`Request includes ${messageFiles.length} files`);
      console.log(`First file preview: ${messageFiles[0].substring(0, 100)}...`);
    }
    
    // Process files for analysis if they exist
    let fileSearchResults = [];
    if (messageFiles && messageFiles.length > 0) {
      console.log(`Processing ${messageFiles.length} files for content extraction...`);
      
      // Create file search results from the file content
      fileSearchResults = messageFiles.map(fileContent => {
        try {
          // Extract file name and content from the file string
          const fileNameMatch = fileContent.match(/^File: (.*?)(?:\n|$)/);
          const fileName = fileNameMatch ? fileNameMatch[1] : "Unknown file";
          
          // Get the content after "Content: " or use the whole string if not found
          const contentMatch = fileContent.match(/Content: ([\s\S]*)/);
          const content = contentMatch ? contentMatch[1] : fileContent;
          
          return {
            filename: fileName,
            content: content
          };
        } catch (error) {
          console.error("Error extracting file information:", error);
          return {
            filename: "Error processing file",
            content: "Could not extract file content"
          };
        }
      });
      
      console.log(`Processed ${fileSearchResults.length} files for analysis`);
    }
    
    // Check if the query likely needs a web search
    let webSearchResults = [];
    const shouldSearch = shouldPerformWebSearch(content);
    
    if (shouldSearch) {
      console.log(`Query "${content}" analyzed and determined to need web search, performing search...`);
      webSearchResults = await performBraveSearch(content);
      console.log(`Search returned ${webSearchResults.length} results`);
    } else {
      console.log(`Query "${content}" analyzed and determined NOT to need web search - model likely has this knowledge`);
    }
    
    // Add a system prompt based on the conversation context
    let systemPrompt = generateSystemPrompt(messageHistory);
    
    // Enhance the system prompt with file contents if they exist
    if (fileSearchResults.length > 0) {
      const fileContext = `
I've analyzed the following files the user has provided:
${fileSearchResults.map((file, index) => `
[${index + 1}] ${file.filename}
${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}
`).join('\n')}

Please analyze these files and respond to the user's query about them.`;
      
      systemPrompt = systemPrompt + "\n" + fileContext;
      console.log("Enhanced system prompt with file contents for analysis");
    }
    
    // Enhance the system prompt with search results as supplementary information
    if (webSearchResults.length > 0) {
      const searchContext = `
I've found some potentially relevant information from the web about the user's query. 
This is supplementary context to help inform your response, but you should not be limited to only this information.
Use your own knowledge and capabilities alongside this information to provide the best possible answer.

Here are some relevant web search results:
${webSearchResults.map((result, index) => `
[${index + 1}] ${result.title}
URL: ${result.url}
${result.snippet}
`).join('\n')}

Feel free to reference this information if it's helpful, but also draw on your broader knowledge to provide a comprehensive response to the user's question.`;
      
      systemPrompt = systemPrompt + "\n" + searchContext;
      console.log("Enhanced system prompt with search results as supplementary information");
    }
    
    // Format varies by provider
    try {
      let response;
      switch(model.provider.toLowerCase()) {
        case 'openai':
          // Check if this is an O-series reasoning model that needs special handling
          if (isOSeriesReasoningModel(model.id)) {
            response = await handleOpenAIReasoningModel(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, fileSearchResults);
          } else {
            response = await handleOpenAIStandard(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, fileSearchResults);
          }
          break;
        case 'anthropic':
          response = await handleAnthropic(messageHistory, content, model.id, systemPrompt, messageImages, fileSearchResults);
          break;
        case 'google':
          response = await handleGoogle(messageHistory, content, model.id, systemPrompt, messageImages, fileSearchResults);
          break;
        case 'xai':
          response = await handleXAI(messageHistory, content, model.id, systemPrompt, messageImages, fileSearchResults);
          break;
        case 'krutrim':
          response = await handleKrutrim(messageHistory, content, model.id, systemPrompt, messageImages, fileSearchResults);
          break;
        default:
          throw new Error(`Provider ${model.provider} not supported`);
      }
      
      // Validate that we got a proper response
      if (response) {
        // Get the response body as text
        const responseBody = await response.text();
        
        // Parse it as JSON if it's not a stream
        let responseData;
        try {
          responseData = JSON.parse(responseBody);
        } catch (e) {
          // This is probably a stream, so we'll return it as-is
          // Create a new response with the original body but ensure CORS headers are added
          return new Response(responseBody, {
            status: response.status,
            headers: {
              ...corsHeaders,
              ...Object.fromEntries(response.headers.entries())
            }
          });
        }
        
        // Add file search results to the JSON response
        if (fileSearchResults.length > 0) {
          responseData.fileSearchResults = fileSearchResults;
        }
        
        // Return a new response with the JSON data and ensure CORS headers are added
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error("Handler did not return a valid response");
      }
      
    } catch (handlerError) {
      console.error(`Handler error for ${model.provider}:`, handlerError);
      return new Response(
        JSON.stringify({ 
          content: `Error: ${handlerError.message || 'An unexpected error occurred'}`,
          model: model.id,
          provider: model.provider,
          tokens: { input: 0, output: 0 },
          webSearchResults: webSearchResults,
          fileSearchResults: fileSearchResults
        }),
        { 
          status: 200,  // Return 200 even for errors to prevent client from breaking 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error(`Error in chat function:`, error);
    return new Response(
      JSON.stringify({ 
        content: `Sorry, an error occurred: ${error.message || 'An unexpected error occurred'}`,
        tokens: { input: 0, output: 0 },
        webSearchResults: [],
        fileSearchResults: []
      }),
      { 
        status: 200, // Return 200 even for errors to prevent client from breaking
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
