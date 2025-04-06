
// Extract main topics from conversation
export function extractTopics(messageHistory: any[]) {
  // Simple implementation - in a real system, you might use an LLM to analyze this
  const allText = messageHistory.map(msg => msg.content).join(' ').toLowerCase();
  const topics = [];
  
  // Check for common topics - this is a simplified example
  if (allText.includes('code') || allText.includes('programming') || allText.includes('javascript')) {
    topics.push('programming');
  }
  if (allText.includes('explain') || allText.includes('how to')) {
    topics.push('explanations');
  }
  if (allText.includes('data') || allText.includes('analysis')) {
    topics.push('data analysis');
  }
  
  return topics;
}

// Extract user preferences from conversation
export function extractUserPreferences(messageHistory: any[]) {
  // Simple implementation - in a real system, you might use an LLM to analyze this
  const userMessages = messageHistory.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());
  const preferences = [];
  
  // Very simple preference detection
  const conciseResponses = userMessages.some(msg => msg.includes('short') || msg.includes('brief') || msg.includes('concise'));
  if (conciseResponses) {
    preferences.push('concise responses');
  }
  
  const detailedResponses = userMessages.some(msg => msg.includes('detail') || msg.includes('explain more'));
  if (detailedResponses) {
    preferences.push('detailed explanations');
  }
  
  return preferences;
}

// Generate a system prompt based on conversation context
export function generateSystemPrompt(messageHistory: any[]) {
  // Default system prompt
  let systemPrompt = "You are Krix, a helpful AI assistant. Be concise, clear, and maintain context from previous messages.";
  
  // Enhance the system prompt based on the conversation history
  if (messageHistory.length > 0) {
    // Extract topics from recent messages
    const recentTopics = extractTopics(messageHistory);
    if (recentTopics.length > 0) {
      systemPrompt += ` The conversation has been about: ${recentTopics.join(', ')}.`;
    }
    
    // Add memory of user preferences based on interaction
    const userPreferences = extractUserPreferences(messageHistory);
    if (userPreferences.length > 0) {
      systemPrompt += ` The user seems to prefer: ${userPreferences.join(', ')}.`;
    }
  }
  
  return systemPrompt;
}
