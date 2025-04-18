
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

// Simple in-memory cache for system prompts to avoid regeneration
const systemPromptCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Get cached system prompt or generate a new one
function getCachedOrGenerateSystemPrompt(messageHistory: any[]) {
  // Use the last few messages as the cache key
  const cacheKey = messageHistory.slice(-3).map(m => `${m.role}:${m.content?.substring(0, 50)}`).join('|');
  const cached = systemPromptCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log('Using cached system prompt');
    return cached.prompt;
  }
  
  const prompt = generateSystemPrompt(messageHistory);
  systemPromptCache.set(cacheKey, {
    prompt,
    timestamp: Date.now()
  });
  
  return prompt;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { content, model, messages, images, files } = await req.json();
    
    // Prepare conversation history in the format the APIs expect
    const messageHistory = messages || [];
    // Get any images that were attached to the message
    const messageImages = images || [];
    // Get any files that were attached to the message
    const messageFiles = files || [];
    
    console.log(`Request received for provider: ${model.provider}, model: ${model.id}`);
    
    // Extract URLs from the user's message - only if necessary
    let webContentFiles: string[] = [];
    const urls = content ? extractUrls(content) : [];
    
    // If URLs are found and not already included in the files, fetch their content
    if (urls.length > 0) {
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
        
        // Fetch content for each URL concurrently
        const fetchPromises = urlsToFetch.map(async (url) => {
          try {
            const urlContent = await fetchUrlContent(url);
            if (urlContent) {
              return `URL: ${url}\nContent: ${urlContent}`;
            }
            return null;
          } catch (e) {
            console.error(`Error fetching URL ${url}:`, e);
            return null;
          }
        });
        
        // Wait for all fetch operations to complete
        const fetchedContents = await Promise.all(fetchPromises);
        webContentFiles = fetchedContents.filter(Boolean) as string[];
      }
    }
    
    // Combine regular files with web content files
    const allFiles = [...messageFiles, ...webContentFiles];
    
    // Check if the query likely needs a web search
    let webSearchResults = [];
    
    // Check if we already have URLs in the message or in files
    // If we do, we'll skip the web search
    const hasExplicitUrls = urls.length > 0 || messageFiles.some(file => file.startsWith('URL:'));
    
    // Only perform search if we don't have explicit URLs and the query likely needs search
    // and content is not empty
    if (!hasExplicitUrls && content) {
      const shouldSearch = shouldPerformWebSearch(content);
      
      if (shouldSearch) {
        console.log(`Query needs web search, performing search...`);
        // Perform search in parallel with other operations
        webSearchResults = await performBraveSearch(content);
      }
    }
    
    // Add a system prompt based on the conversation context - use cached when possible
    let systemPrompt = getCachedOrGenerateSystemPrompt(messageHistory);
    
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
`).join('\n')}`;
      
      systemPrompt = systemPrompt + "\n" + searchContext;
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
      
      const totalTime = Date.now() - startTime;
      console.log(`Request processed in ${totalTime}ms`);
      
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
