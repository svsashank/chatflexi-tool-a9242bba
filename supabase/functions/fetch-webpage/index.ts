
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch the content of a webpage using Brave Search's API
async function fetchWebpageContent(url: string): Promise<string | null> {
  const BRAVE_API_KEY = Deno.env.get('BRAVE_API_KEY');
  
  if (!BRAVE_API_KEY) {
    console.error("Brave API key not configured");
    return null;
  }

  try {
    console.log(`Fetching content from URL: ${url}`);
    
    // Use Brave's API to fetch webpage content
    const fetchUrl = new URL('https://api.search.brave.com/res/v1/web/index');
    fetchUrl.searchParams.append('url', url);
    
    const response = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Brave API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract text content from the response
    if (data && data.web) {
      // Return the extracted content (combine title and body content)
      const title = data.web.title || '';
      const bodyContent = data.web.body || '';
      
      console.log(`Successfully extracted ${bodyContent.length} characters from ${url}`);
      return `${title}\n\n${bodyContent}`.trim();
    }
    
    console.log(`No content found for URL: ${url}`);
    return null;
  } catch (error) {
    console.error(`Error fetching webpage content for ${url}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid URLs provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing ${urls.length} URLs`);
    
    // Fetch content for each URL in parallel
    const fetchPromises = urls.map(async (url) => {
      const content = await fetchWebpageContent(url);
      return [url, content];
    });
    
    const results = await Promise.all(fetchPromises);
    
    // Convert results to an object mapping URLs to their content
    const webContent = Object.fromEntries(
      results.filter(([_, content]) => content !== null)
    );
    
    return new Response(
      JSON.stringify({ webContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-webpage function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
