
// Utility functions to perform Brave Search API calls

// Helper to make a search request to Brave
export async function performBraveSearch(query: string, count: number = 5): Promise<any[]> {
  const BRAVE_API_KEY = Deno.env.get('BRAVE_API_KEY');
  
  if (!BRAVE_API_KEY) {
    console.error("Brave API key not configured");
    return [];
  }
  
  const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
  searchUrl.searchParams.append('q', query);
  searchUrl.searchParams.append('count', count.toString());
  searchUrl.searchParams.append('search_lang', 'en');
  
  console.log(`Performing Brave search for query: "${query}" with API key: ${BRAVE_API_KEY.substring(0, 3)}...`);
  
  try {
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Brave Search API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Extract the web search results
    if (data.web && data.web.results && Array.isArray(data.web.results)) {
      console.log(`Received ${data.web.results.length} search results from Brave`);
      
      // Transform the results to match our expected format
      const results = data.web.results.map((result: any) => ({
        title: result.title || 'No title',
        url: result.url || '',
        snippet: result.description || 'No description available'
      }));
      
      console.log("Processed search results:", JSON.stringify(results).substring(0, 500) + "...");
      return results;
    }
    
    console.log("No web search results found in Brave response");
    return [];
  } catch (error) {
    console.error("Error making Brave Search request:", error);
    return [];
  }
}

// Helper function to check if a query likely needs web search
export function shouldPerformWebSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Check for factual questions that would benefit from search
  if (
    lowerQuery.includes('what is') ||
    lowerQuery.includes('who is') || 
    lowerQuery.includes('when was') ||
    lowerQuery.includes('where is') ||
    lowerQuery.includes('how to') ||
    lowerQuery.includes('why does') ||
    lowerQuery.includes('tell me about') ||
    lowerQuery.includes('find information') ||
    lowerQuery.includes('search for') ||
    lowerQuery.includes('have you heard') ||
    lowerQuery.includes('latest') ||
    lowerQuery.includes('recent') ||
    lowerQuery.includes('news about') ||
    lowerQuery.includes('current')
  ) {
    return true;
  }
  
  // Check for specific entities that might need web search
  const potentialEntities = query.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g);
  if (potentialEntities && potentialEntities.length > 0) {
    return true;
  }
  
  // If the query is longer than 10 words, it might be a complex question needing search
  const wordCount = query.split(/\s+/).length;
  if (wordCount > 10) {
    return true;
  }
  
  return false;
}

