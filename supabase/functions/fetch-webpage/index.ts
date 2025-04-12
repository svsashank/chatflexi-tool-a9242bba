
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { load } from "https://deno.land/x/cheerio@1.0.6/mod.ts";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handles preflight CORS requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: URLs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing ${urls.length} URLs:`, urls);
    
    // Limit number of URLs to process to prevent abuse
    const urlsToProcess = urls.slice(0, 5);
    
    // Process URLs in parallel with a timeout
    const webContent = {};
    
    await Promise.all(urlsToProcess.map(async (url) => {
      try {
        console.log(`Fetching content from ${url}...`);
        
        // Fetch the webpage with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Error fetching ${url}: ${response.status} ${response.statusText}`);
          return;
        }
        
        // Get content type to handle different types of content
        const contentType = response.headers.get('content-type') || '';
        
        // If it's HTML, parse it with cheerio (BeautifulSoup equivalent for Deno)
        if (contentType.includes('text/html')) {
          const html = await response.text();
          const $ = load(html);
          
          // Remove script and style elements
          $('script, style, nav, footer, header').remove();
          
          // Get page title
          const title = $('title').text().trim();
          
          // Get meta description
          let description = $('meta[name="description"]').attr('content') || '';
          
          // Extract main content - focus on article, main content areas
          let mainContent = '';
          
          // Priority containers to check
          const contentSelectors = [
            'article', 'main', '.content', '.post-content', 
            '#content', '.article-content', '.post', '.entry-content',
            '[role="main"]'
          ];
          
          // Try to find main content container
          for (const selector of contentSelectors) {
            if ($(selector).length) {
              mainContent = $(selector).text().trim();
              break;
            }
          }
          
          // If no specific content container found, get body text as fallback
          if (!mainContent) {
            mainContent = $('body').text().trim();
          }
          
          // Clean up the text (remove excessive whitespace)
          mainContent = mainContent
            .replace(/\s+/g, ' ')
            .trim();
          
          // Create a structured format
          const extractedContent = `
TITLE: ${title}
URL: ${url}
DESCRIPTION: ${description}
CONTENT:
${mainContent.substring(0, 8000)}${mainContent.length > 8000 ? '... (content truncated)' : ''}
          `.trim();
          
          webContent[url] = extractedContent;
          console.log(`Successfully extracted ${extractedContent.length} characters from ${url}`);
        } else if (contentType.includes('application/json')) {
          // Handle JSON content
          const jsonData = await response.json();
          webContent[url] = JSON.stringify(jsonData, null, 2).substring(0, 8000);
          console.log(`Successfully extracted JSON content from ${url}`);
        } else if (contentType.includes('text/')) {
          // Handle other text content
          const text = await response.text();
          webContent[url] = text.substring(0, 8000);
          console.log(`Successfully extracted text content from ${url}`);
        } else {
          console.log(`Skipping non-text content from ${url} (${contentType})`);
          webContent[url] = `[Content type ${contentType} not supported for extraction]`;
        }
      } catch (error) {
        console.error(`Error processing ${url}:`, error.message);
        webContent[url] = `Error extracting content: ${error.message}`;
      }
    }));
    
    return new Response(
      JSON.stringify({ webContent }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in fetch-webpage function:', error);
    return new Response(
      JSON.stringify({ error: `Failed to process request: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }
    );
  }
});
