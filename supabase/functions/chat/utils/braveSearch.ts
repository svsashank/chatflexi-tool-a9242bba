

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
  const lowerQuery = query.toLowerCase().trim();
  
  // If query is too short (less than 4 words), probably not a search query
  // unless it contains specific search indicators
  const wordCount = query.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    // Short queries still need search if they contain specific keywords
    const shortQuerySearchTerms = ['latest', 'news', 'current', 'recent', 'today'];
    if (!shortQuerySearchTerms.some(term => lowerQuery.includes(term))) {
      return false;
    }
  }
  
  // Context-dependent phrases that suggest internal knowledge is sufficient
  const internalKnowledgePatterns = [
    /^(?:can|could) you/i,      // "Can you tell me about X" often asks for AI capabilities
    /how (?:do|would|can) you/i, // "How do you solve X" often asks for AI explanation
    /what (?:do|would) you/i,    // "What do you think about X" often asks for AI opinion
    /^tell me a joke/i,          // Jokes don't need search
    /^write (?:a|some|me)/i,     // Creative writing tasks
    /^generate (?:a|some|me)/i,  // Generation tasks
    /^create (?:a|some|me)/i,    // Creation tasks
    /^translate/i,               // Translation tasks
    /^summarize/i,               // Summarization without context often doesn't need search
    /\bphilosophy\b/i,           // Philosophical questions often use AI's reasoning
    /\bopinion\b/i,              // Opinion requests
    /\bthoughts\b/i              // Thought requests
  ];
  
  // If query matches internal knowledge patterns, it likely doesn't need search
  if (internalKnowledgePatterns.some(pattern => pattern.test(lowerQuery))) {
    // However, if it ALSO contains indicators of needing external data, we still search
    const overrideTerms = ['latest', 'recent', 'news', 'current', 'today', 'yesterday', 'facts about', 'statistics'];
    const needsOverride = overrideTerms.some(term => lowerQuery.includes(term));
    if (!needsOverride) {
      return false;
    }
  }
  
  // Check for factual questions that likely need search
  const factualPatterns = [
    /what (?:is|are|was|were) (?!your|my)/i, // What is/are but not "what is your name"
    /who (?:is|are|was|were)/i,
    /when (?:is|was|will)/i,
    /where (?:is|are|was|were)/i,
    /why (?:is|are|was|were|does|did)/i,
    /how (?:is|are|was|were|does|did) (?!.*feel)/i, // How does X work but not "how does that make you feel"
    /\bhistory of\b/i,
    /\bdefinition of\b/i,
    /tell me about (?!yourself)/i,  // Tell me about X but not "tell me about yourself"
    /\bfind\b/i,
    /\bsearch\b/i,
    /have you heard/i,
    /\bnews\b/i,
    /\binformation\b/i,
    /\bdata\b/i,
    /\bstats\b|\bstatistics\b/i,
    /\blatest\b|\brecent\b|\bcurrent\b/i
  ];
  
  if (factualPatterns.some(pattern => pattern.test(lowerQuery))) {
    return true;
  }
  
  // Check for specific named entities that might need search (more sophisticated)
  // Look for proper nouns (capitalized multi-word phrases or single words)
  const potentialEntities = query.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g);
  if (potentialEntities && potentialEntities.length > 0) {
    // Filter out common sentence starters that might be capitalized
    const commonWords = ['I', 'My', 'You', 'Your', 'We', 'They', 'Their', 'The', 'A', 'An'];
    const significantEntities = potentialEntities.filter(entity => 
      !commonWords.includes(entity) && entity.length > 1
    );
    
    if (significantEntities.length > 0) {
      return true;
    }
  }
  
  // Check for dates, which often indicate time-sensitive information
  const datePattern = /\b(19|20)\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?\b/i;
  if (datePattern.test(query)) {
    return true;
  }
  
  // Complex questions (longer than threshold) might benefit from search
  // This is a fallback for complex queries not caught by other patterns
  if (wordCount > 12) {
    return true;
  }
  
  // If we've gotten this far, the query probably doesn't need a search
  return false;
}

