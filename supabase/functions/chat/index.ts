
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { corsHeaders } from "./utils/cors.ts";
import { generateSystemPrompt } from "./utils/context.ts";
import { performBraveSearch, shouldPerformWebSearch, fetchUrlContent } from "./utils/braveSearch.ts";

// Import handlers for different model providers
import { handleOpenAIStandard, handleOpenAIReasoningModel, isOSeriesReasoningModel } from "./handlers/openai.ts";
import { handleAnthropic } from "./handlers/anthropic.ts";
import { handleGoogle } from "./handlers/google.ts";
import { handleXAI } from "./handlers/xai.ts";
import { handleKrutrim } from "./handlers/krutrim.ts";

// Helper to extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    
    // Extract URLs from the user's message
    const urls = extractUrls(content);
    let webContentFiles: string[] = [];
    
    // If URLs are found and not already included in the files, fetch their content
    if (urls.length > 0) {
      console.log(`Found ${urls.length} URLs in the message, checking if they need to be fetched`);
      
      // Check if the URLs have already been processed (in the files array)
      const existingUrls = messageFiles
        .filter(file => file.startsWith('URL:'))
        .map(file => {
          const urlLine = file.split('\n')[0];
          return urlLine.substring(5).trim(); // Extract URL from "URL: [url]"
        });
      
      // Only fetch URLs that haven't been processed yet
      const urlsToFetch = urls.filter(url => !existingUrls.includes(url));
      
      if (urlsToFetch.length > 0) {
        console.log(`Fetching content for ${urlsToFetch.length} new URLs`);
        
        // Fetch content for each URL
        for (const url of urlsToFetch) {
          const urlContent = await fetchUrlContent(url);
          if (urlContent) {
            webContentFiles.push(`URL: ${url}\nContent: ${urlContent}`);
            console.log(`Added content from URL: ${url} (${urlContent.length} characters)`);
          }
        }
      }
    }
    
    // Combine regular files with web content files
    const allFiles = [...messageFiles, ...webContentFiles];
    
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
            response = await handleOpenAIReasoningModel(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          } else {
            response = await handleOpenAIStandard(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          }
          break;
        case 'anthropic':
          response = await handleAnthropic(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'google':
          response = await handleGoogle(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'xai':
          response = await handleXAI(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'krutrim':
          response = await handleKrutrim(messageHistory, content, model.id, systemPrompt, messageImages, webSearchResults, allFiles);
          break;
        default:
          throw new Error(`Provider ${model.provider} not supported`);
      }
      
      // Validate that we got a proper response
      if (response) {
        return response;
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
          fileSearchResults: []
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
