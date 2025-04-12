
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

// Helper function to fetch content from a specific URL
export async function fetchUrlContent(url: string): Promise<string | null> {
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
  
  // Additional patterns for common knowledge that LLMs would know about
  const commonKnowledgePatterns = [
    /\bhistory\b|\bhistorical\b/i,  // Historical topics are usually in LLM training
    /\bwho (?:is|was|are|were) .*?\b/i, // Questions about people/groups in history
    /\bwhere (?:is|was|are|were) .*?\b(?!.*?(?:right now|today|currently|latest))/i, // General location questions
    /\bwhen (?:is|was|were)\b(?!.*?(?:next|upcoming|future|scheduled))/i, // Historical timing questions
    /\bwhy (?:did|were|was)\b(?!.*?(?:yesterday|today|recently|last week))/i, // Historical reasoning questions
    /\bcapital of\b/i, // Questions about capitals
    /\bmeaning of\b/i, // Word or phrase meanings
    /\bdefinition\b/i, // Definitions
    /\b(?:ancient|medieval|classical|traditional)\b/i, // Historical period indicators
    /\b(?:empire|dynasty|kingdom|civilization)\b/i, // Historical societies
    /\b(?:scientist|inventor|philosopher|author|artist|composer)\b/i, // Historical figures
    /\b(?:written|authored|composed|created|invented|discovered)\b(?!.*?(?:recently|lately|this year|last month))/i, // Creative/scientific achievements
    /\btheory of\b/i, // Scientific theories
    /\bconcept of\b/i  // Abstract concepts
  ];
  
  // If the query matches common knowledge patterns without time-sensitive indicators,
  // the LLM likely has sufficient knowledge
  if (commonKnowledgePatterns.some(pattern => pattern.test(lowerQuery))) {
    // But still search if time-sensitive keywords are present
    const timeRelevantTerms = ['latest', 'recent', 'news', 'current', 'today', 'yesterday', 'this week', 'this month', 'this year'];
    
    if (!timeRelevantTerms.some(term => lowerQuery.includes(term))) {
      // Look for explicit requests for updated or current information  
      const needsCurrentInfo = /\bcurrent|\blatest|\brecent|\bnow|\btoday|\bthis year\b/.test(lowerQuery);
      if (!needsCurrentInfo) {
        console.log("Query matches common knowledge pattern without time relevance, skipping search");
        return false;
      }
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
  
  // For factual patterns, we need to be more discriminating
  if (factualPatterns.some(pattern => pattern.test(lowerQuery))) {
    // First check if it's about time-sensitive information
    const timeRelevantTerms = ['latest', 'recent', 'news', 'current', 'today', 'yesterday', 'this week', 'this month', 'this year'];
    const isTimeRelevant = timeRelevantTerms.some(term => lowerQuery.includes(term));
    
    if (isTimeRelevant) {
      return true;
    }
    
    // Check for specific named entities that might need very updated information
    const politicalTerms = [
      'president', 'prime minister', 'chancellor', 'election', 'government', 
      'congress', 'parliament', 'senate', 'law', 'bill', 'policy', 'politician'
    ];
    const sportTerms = [
      'score', 'game', 'match', 'tournament', 'championship', 'league',
      'player', 'team', 'season', 'standing', 'ranking'
    ];
    const techTerms = [
      'release', 'version', 'update', 'launch', 'product', 'device',
      'software', 'hardware', 'app', 'technology', 'feature', 'bug'
    ];
    const businessTerms = [
      'stock', 'price', 'market', 'company', 'corporation', 'business',
      'finance', 'economic', 'economy', 'trade', 'investment', 'profit'
    ];
    
    // If the query contains time-sensitive domain terms, perform search
    const timeRelevantDomains = [
      ...politicalTerms, ...sportTerms, ...techTerms, ...businessTerms
    ];
    if (timeRelevantDomains.some(term => lowerQuery.includes(term))) {
      return true;
    }
    
    // For factual questions about other topics, models can often answer from training
    console.log("Factual query but not time-sensitive or domain-specific, skipping search");
    return false;
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
      // For entities, check if they're likely to need current information
      const timeRelevantTerms = ['latest', 'recent', 'news', 'current', 'today', 'yesterday', 'this week'];
      const isTimeRelevant = timeRelevantTerms.some(term => lowerQuery.includes(term));
      
      if (isTimeRelevant) {
        return true;
      }
      
      // For non-time-sensitive entity questions, skip search
      console.log("Entity query but not time-sensitive, skipping search");
      return false;
    }
  }
  
  // Check for dates, which often indicate time-sensitive information
  const datePattern = /\b(19|20)\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?\b/i;
  if (datePattern.test(query)) {
    // If it's a recent date, search is likely needed
    const currentYear = new Date().getFullYear();
    const yearMatches = query.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      const years = yearMatches.map(y => parseInt(y, 10));
      // If any year is within last 3 years, likely needs search
      if (years.some(y => y >= currentYear - 3)) {
        return true;
      }
    }
    
    // For other date references, may not need search if historical
    return false;
  }
  
  // Complex questions (longer than threshold) might benefit from search
  // This is a fallback for complex queries not caught by other patterns
  if (wordCount > 15) {
    // However, if it seems like a multi-part historical question, skip search
    const historicalIndicators = [
      'history', 'historical', 'ancient', 'medieval', 'classical', 
      'traditional', 'empire', 'dynasty', 'kingdom', 'civilization'
    ];
    const hasHistoricalTerms = historicalIndicators.some(term => lowerQuery.includes(term));
    
    if (hasHistoricalTerms) {
      console.log("Complex historical query, skipping search");
      return false;
    }
    
    return true;
  }
  
  // If we've gotten this far, the query probably doesn't need a search
  return false;
}
