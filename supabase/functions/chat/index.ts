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
import { handleOpenRouter } from "./handlers/openrouter.ts";

// Enhanced cache for system prompts with TTL
const systemPromptCache = new Map<string, {
  timestamp: number;
  prompt: string;
}>();

// Shorter cache TTL for better relevance
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes (reduced from 5)

// Request processing metrics
const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  totalProcessingTime: 0,
  averageProcessingTime: 0
};

// Helper to extract URLs from text
function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Get cached system prompt or generate a new one - optimized for performance
function getCachedOrGenerateSystemPrompt(messageHistory: any[]) {
  // Use more specific cache key
  const historyLength = Math.min(messageHistory.length, 3);
  const recentMessages = messageHistory.slice(-historyLength);
  const cacheKey = recentMessages.map(m => 
    `${m.role}:${(m.content || '').substring(0, 40)}`
  ).join('|');
  
  const cached = systemPromptCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    metrics.cacheHits++;
    return cached.prompt;
  }
  
  const prompt = generateSystemPrompt(messageHistory);
  systemPromptCache.set(cacheKey, {
    prompt,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries periodically
  if (metrics.totalRequests % 10 === 0) {
    const now = Date.now();
    for (const [key, value] of systemPromptCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        systemPromptCache.delete(key);
      }
    }
  }
  
  return prompt;
}

// Configuration for model routing and fallback
const USE_OPENROUTER = true; // Set to true to route all requests through OpenRouter
const USE_OPENROUTER_FALLBACK = true; // Set to true to use OpenRouter as fallback for failed requests

// Main server function
serve(async (req) => {
  const startTime = Date.now();
  metrics.totalRequests++;

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
    
    // Get any files that were attached to the message - limit total size
    const MAX_TOTAL_FILE_SIZE = 250000; // bytes
    let totalFileSize = 0;
    let messageFiles = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        const fileSize = file.length;
        if (totalFileSize + fileSize > MAX_TOTAL_FILE_SIZE) {
          // If we'd exceed the limit, truncate or skip
          const remainingSpace = MAX_TOTAL_FILE_SIZE - totalFileSize;
          if (remainingSpace > 500) { // Only add if we can include meaningful content
            const truncatedFile = file.substring(0, remainingSpace) + 
              "\n... (content truncated for performance) ...";
            messageFiles.push(truncatedFile);
          }
          break;
        } else {
          messageFiles.push(file);
          totalFileSize += fileSize;
        }
      }
    }
    
    console.log(`Processing request for provider: ${model.provider}, model: ${model.id}`);
    
    // Extract URLs from the user's message - only if necessary and efficiently
    let webContentFiles: string[] = [];
    const urls = content ? extractUrls(content) : [];
    
    // If URLs are found and not already included in the files, fetch their content efficiently
    if (urls.length > 0) {
      // Check if the URLs have already been processed (in the files array)
      const existingUrls = messageFiles
        .filter(file => file.startsWith('URL:'))
        .map(file => {
          const urlLine = file.split('\n')[0];
          return urlLine.substring(5).trim(); // Extract URL from "URL: [url]"
        });
      
      // Only fetch URLs that haven't been processed yet, limit to first 3 for performance
      const urlsToFetch = urls
        .filter(url => !existingUrls.includes(url))
        .slice(0, 3); // Limit to 3 URLs for performance
      
      if (urlsToFetch.length > 0) {
        console.log(`Fetching content for ${urlsToFetch.length} new URLs`);
        
        // Set timeout for URL fetching to prevent excessive wait times
        const URL_FETCH_TIMEOUT = 5000; // 5 seconds max for URL fetching
        
        // Use Promise.race with a timeout for each URL fetch
        const fetchPromises = urlsToFetch.map(async (url) => {
          try {
            // Create a timeout promise that rejects after URL_FETCH_TIMEOUT
            const timeoutPromise = new Promise<null>((_, reject) => {
              setTimeout(() => reject(new Error(`URL fetch timed out for ${url}`)), URL_FETCH_TIMEOUT);
            });
            
            // Race between actual fetch and timeout
            const urlContent = await Promise.race([
              fetchUrlContent(url),
              timeoutPromise
            ]);
            
            if (urlContent) {
              // Truncate URL content to 10KB max for performance
              const MAX_URL_CONTENT = 10 * 1024;
              const truncatedContent = urlContent.length > MAX_URL_CONTENT ?
                urlContent.substring(0, MAX_URL_CONTENT) + "... (content truncated for performance)" :
                urlContent;
              
              return `URL: ${url}\nContent: ${truncatedContent}`;
            }
            return null;
          } catch (e) {
            console.error(`Error fetching URL ${url}:`, e);
            return null;
          }
        });
        
        // Use Promise.allSettled to handle both successful and failed fetches
        const fetchResults = await Promise.allSettled(fetchPromises);
        webContentFiles = fetchResults
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<string>).value);
      }
    }
    
    // Combine regular files with web content files, respecting size limits
    let allFiles = [...messageFiles];
    for (const webFile of webContentFiles) {
      if (totalFileSize + webFile.length <= MAX_TOTAL_FILE_SIZE) {
        allFiles.push(webFile);
        totalFileSize += webFile.length;
      } else {
        break; // Stop adding files if we exceed the limit
      }
    }
    
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
        // Perform search with a timeout
        const SEARCH_TIMEOUT = 7000; // 7 seconds timeout for search
        
        try {
          // Set up a race between the search and a timeout
          const timeoutPromise = new Promise<[]>((_, reject) => {
            setTimeout(() => reject(new Error('Web search timed out')), SEARCH_TIMEOUT);
          });
          
          webSearchResults = await Promise.race([
            performBraveSearch(content),
            timeoutPromise
          ]);
          
          // Limit search results for performance
          if (webSearchResults.length > 3) {
            webSearchResults = webSearchResults.slice(0, 3);
          }
        } catch (searchError) {
          console.error('Web search error or timeout:', searchError);
          webSearchResults = []; // Empty array on error
        }
      }
    }
    
    // Add a system prompt based on the conversation context - use cached when possible
    const systemPrompt = getCachedOrGenerateSystemPrompt(messageHistory);
    
    // Enhance the system prompt with search results as supplementary information - kept concise
    let enhancedSystemPrompt = systemPrompt;
    if (webSearchResults.length > 0) {
      enhancedSystemPrompt = `${systemPrompt}\n\nRelevant web search results:\n${webSearchResults.map((result, index) => `[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`).join('\n\n')}`;
    }
    
    // Check if we should use OpenRouter for all requests
    if (USE_OPENROUTER && model.provider.toLowerCase() !== 'openrouter') {
      console.log(`Routing request to OpenRouter instead of ${model.provider}`);
      // Override the provider to use OpenRouter
      try {
        return await handleOpenRouter(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
      } catch (openRouterError) {
        // If OpenRouter fails and we're not using it as a fallback, rethrow the error
        if (!USE_OPENROUTER_FALLBACK) {
          throw openRouterError;
        }
        // Otherwise, proceed with the original provider as a fallback
        console.log(`OpenRouter failed, falling back to original provider: ${model.provider}`);
      }
    }
    
    // Format varies by provider
    try {
      let response;
      switch(model.provider.toLowerCase()) {
        case 'openai':
          // Check if this is an O-series reasoning model that needs special handling
          if (isOSeriesReasoningModel(model.id)) {
            response = await handleOpenAIReasoningModel(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          } else {
            response = await handleOpenAIStandard(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          }
          break;
        case 'anthropic':
          response = await handleAnthropic(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'google':
          response = await handleGoogle(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'xai':
          response = await handleXAI(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'krutrim':
          response = await handleKrutrim(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          break;
        case 'openrouter':
          response = await handleOpenRouter(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          break;
        default:
          // Try OpenRouter as fallback for unknown providers if enabled
          if (USE_OPENROUTER_FALLBACK) {
            console.log(`Provider ${model.provider} not directly supported, using OpenRouter as fallback`);
            response = await handleOpenRouter(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          } else {
            throw new Error(`Provider ${model.provider} not supported`);
          }
      }
      
      // Update metrics
      const totalTime = Date.now() - startTime;
      metrics.totalProcessingTime += totalTime;
      metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.totalRequests;
      
      console.log(`Request processed in ${totalTime}ms (Avg: ${metrics.averageProcessingTime.toFixed(0)}ms, Cache hits: ${metrics.cacheHits}/${metrics.totalRequests})`);
      
      // Validate that we got a proper response
      if (response) {
        return response;
      } else {
        throw new Error("Handler did not return a valid response");
      }
      
    } catch (handlerError) {
      console.error(`Handler error for ${model.provider}:`, handlerError);
      
      // Try OpenRouter as fallback if enabled
      if (USE_OPENROUTER_FALLBACK && model.provider.toLowerCase() !== 'openrouter') {
        try {
          console.log(`Primary handler failed, trying OpenRouter as fallback`);
          const fallbackResponse = await handleOpenRouter(messageHistory, content, model.id, enhancedSystemPrompt, messageImages, webSearchResults, allFiles);
          return fallbackResponse;
        } catch (fallbackError) {
          console.error(`OpenRouter fallback also failed:`, fallbackError);
          // Continue to error response below
        }
      }
      
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
    const totalTime = Date.now() - startTime;
    console.log(`Request failed in ${totalTime}ms`);
    
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
