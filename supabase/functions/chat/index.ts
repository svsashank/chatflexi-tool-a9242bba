
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, model, messages } = await req.json();
    
    // Prepare conversation history in the format the APIs expect
    const messageHistory = messages || [];
    
    console.log(`Request received for provider: ${model.provider}, model: ${model.id}`);
    
    // Add a system prompt based on the conversation context
    const systemPrompt = generateSystemPrompt(messageHistory);
    
    // Format varies by provider
    switch(model.provider.toLowerCase()) {
      case 'openai':
        return await handleOpenAI(messageHistory, content, model.id, systemPrompt);
      case 'anthropic':
        return await handleAnthropic(messageHistory, content, model.id, systemPrompt);
      case 'google':
        return await handleGoogle(messageHistory, content, model.id, systemPrompt);
      case 'xai':
        return await handleXAI(messageHistory, content, model.id, systemPrompt);
      case 'krutrim':
        return await handleKrutrim(messageHistory, content, model.id, systemPrompt);
      default:
        throw new Error(`Provider ${model.provider} not supported`);
    }
  } catch (error) {
    console.error(`Error in chat function:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Generate a system prompt based on conversation context
function generateSystemPrompt(messageHistory) {
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

// Extract main topics from conversation
function extractTopics(messageHistory) {
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
function extractUserPreferences(messageHistory) {
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

// OpenAI (GPT) handler
async function handleOpenAI(messageHistory, content, modelId, systemPrompt) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for OpenAI
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role,
      // Only include the actual content, not any internal notes or system info
      content: msg.content
    })),
    { role: 'user', content }
  ];

  console.log(`Calling OpenAI API...`);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  console.log(`Successfully received response from OpenAI`);
  const data = await response.json();
  return new Response(
    JSON.stringify({ 
      content: data.choices[0].message.content,
      model: modelId,
      provider: 'OpenAI'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Anthropic (Claude) handler
async function handleAnthropic(messageHistory, content, modelId, systemPrompt) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  // Log model ID to help with debugging
  console.log(`Processing request for Anthropic model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Convert from chat format to messages format for Anthropic API
  const messages = [
    // System prompt for Anthropic
    { role: 'user', content: `<instructions>${systemPrompt}</instructions>` },
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      // Only include the actual content, not any internal notes or system info
      content: msg.content
    })),
    { role: 'user', content }
  ];
  
  console.log(`Calling Anthropic API with model ${modelId}...`);
  console.log(`Messages count: ${messages.length}`);
  
  try {
    // Using the correct Claude model IDs
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: 1000,
      })
    });
    
    const responseText = await response.text();
    console.log(`Anthropic API response status: ${response.status}`);
    console.log(`Anthropic API response first 100 chars: ${responseText.substring(0, 100)}...`);
    
    if (!response.ok) {
      console.error(`Anthropic API error: ${response.status} - ${responseText}`);
      try {
        const error = JSON.parse(responseText);
        throw new Error(
          `Anthropic API error: ${response.status} - ${error.error?.message || error.type || 'Unknown error'}`
        );
      } catch (e) {
        throw new Error(`Anthropic API error: ${response.status} - ${responseText}`);
      }
    }
    
    // Parse JSON response
    const data = JSON.parse(responseText);
    console.log(`Successfully received response from Anthropic`);
    console.log(`Response structure: ${JSON.stringify(Object.keys(data))}`);
    
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      return new Response(
        JSON.stringify({ 
          content: data.content[0].text,
          model: modelId,
          provider: 'Anthropic'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected Anthropic response format:", data);
      throw new Error("Unexpected response format from Anthropic API");
    }
  } catch (error) {
    console.error("Error in Anthropic API call:", error);
    throw error;
  }
}

// Google (Gemini) handler
async function handleGoogle(messageHistory, content, modelId, systemPrompt) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing request for Google model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for Gemini, including system prompt
  const formattedContents = [
    // Add system prompt as a first user message
    {
      role: 'user',
      parts: [{ text: `System: ${systemPrompt}` }]
    },
    // Add regular message history - filter out any internal thinking
    ...messageHistory.map(msg => ({
      role: msg.role,
      parts: [{ 
        // Only include the actual content, not any internal notes
        text: msg.content 
      }]
    })),
    // Add the current message
    {
      role: 'user',
      parts: [{ text: content }]
    }
  ];

  // Determine the correct API version and endpoint based on the model ID
  let apiEndpoint;
  
  // New experimental models like gemini-2.5-pro-exp use v1beta
  if (modelId.includes('2.5') || modelId.includes('2.0')) {
    apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
  } else {
    // Older models like gemini-1.5-pro and gemini-1.5-flash use v1
    apiEndpoint = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent`;
  }

  console.log(`Calling Google API with endpoint: ${apiEndpoint}...`);
  try {
    const response = await fetch(`${apiEndpoint}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formattedContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error: ${response.status}`, errorText);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Google API error: ${response.status}`);
      } catch (e) {
        throw new Error(`Google API error: ${response.status} - ${errorText}`);
      }
    }
    
    console.log(`Successfully received response from Google`);
    const data = await response.json();
    return new Response(
      JSON.stringify({ 
        content: data.candidates[0].content.parts[0].text,
        model: modelId,
        provider: 'Google'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Google API call:", error);
    throw error;
  }
}

// xAI (Grok) handler
async function handleXAI(messageHistory, content, modelId, systemPrompt) {
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  if (!XAI_API_KEY) {
    throw new Error("xAI API key not configured. Please add your xAI API key in the Supabase settings.");
  }
  
  // Override model ID to use grok-2-latest as per user's curl example
  const grokModelId = "grok-2-latest";
  console.log(`Processing request for xAI model ${grokModelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for xAI, including system prompt
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role,
      // Only include the actual message content
      content: msg.content
    })),
    { role: 'user', content }
  ];

  console.log(`Calling xAI API with model ${grokModelId}...`);
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: grokModelId,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
      })
    });
    
    // Capture the full response as text first for better debugging
    const responseText = await response.text();
    console.log(`xAI API response status: ${response.status}`);
    console.log(`xAI API response first 100 chars: ${responseText.substring(0, 100)}...`);
    
    if (!response.ok) {
      console.error(`xAI API error: ${response.status} - ${responseText}`);
      try {
        const error = JSON.parse(responseText);
        throw new Error(`xAI API error: ${response.status} - ${error.error?.message || error.error || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`xAI API error: ${response.status} - ${responseText}`);
      }
    }
    
    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log(`Successfully received response from xAI`);
      console.log(`xAI response structure: ${JSON.stringify(Object.keys(parsedResponse))}`);
    } catch (parseError) {
      console.error(`Failed to parse xAI response as JSON: ${responseText}`);
      throw new Error(`Invalid JSON response from xAI API: ${responseText.substring(0, 100)}...`);
    }
    
    // Validate the expected response structure before trying to use it
    if (parsedResponse.choices && 
        Array.isArray(parsedResponse.choices) && 
        parsedResponse.choices.length > 0 && 
        parsedResponse.choices[0].message && 
        parsedResponse.choices[0].message.content) {
      
      return new Response(
        JSON.stringify({ 
          content: parsedResponse.choices[0].message.content,
          model: grokModelId,
          provider: 'xAI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If the response doesn't match what we expect, log it and throw a descriptive error
      console.error("Unexpected xAI response format:", parsedResponse);
      throw new Error(`Unexpected response format from xAI API. The API returned a successful status but the response doesn't match the expected structure.`);
    }
  } catch (error) {
    console.error("Error in xAI API call:", error);
    throw error;
  }
}

// Krutrim API handler for DeepSeek-R1 models
async function handleKrutrim(messageHistory, content, modelId, systemPrompt) {
  const KRUTRIM_API_KEY = Deno.env.get('KRUTRIM_API_KEY');
  if (!KRUTRIM_API_KEY) {
    throw new Error("Krutrim API key not configured. Please add your Krutrim API key in the Supabase settings.");
  }
  
  console.log(`Processing request for Krutrim model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Clean message history to remove any <think> blocks or other internal notes
  const cleanedHistory = messageHistory.map(msg => {
    let cleanContent = msg.content;
    
    // Remove any content between <think> and </think> tags
    cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any system prompt text that might have been captured
    if (cleanContent.includes("You are Krix, a helpful AI assistant")) {
      cleanContent = cleanContent.replace(/You are Krix, a helpful AI assistant[^"]*/g, '');
    }
    
    // Trim any whitespace
    cleanContent = cleanContent.trim();
    
    return {
      role: msg.role,
      content: cleanContent
    };
  });
  
  // Filter out any empty messages after cleaning
  const filteredHistory = cleanedHistory.filter(msg => msg.content.length > 0);
  
  // Format messages for Krutrim API
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...filteredHistory,
    { role: 'user', content }
  ];

  console.log(`Calling Krutrim API with model ${modelId}...`);
  console.log(`Number of messages: ${formattedMessages.length}`);
  
  // Map the model ID to the actual Krutrim model ID based on the specific model
  let krutrimModelId;
  
  switch(modelId) {
    case 'deepseek-r1':
      krutrimModelId = "DeepSeek-R1";
      break;
    case 'deepseek-r1-llama-70b':
      krutrimModelId = "DeepSeek-R1-Llama-70B";
      break;
    case 'deepseek-r1-llama-8b':
      krutrimModelId = "DeepSeek-R1-Llama-8B";
      break;
    case 'deepseek-r1-qwen-14b':
      krutrimModelId = "DeepSeek-R1-Qwen-14B";
      break;
    default:
      krutrimModelId = "DeepSeek-R1"; // Default to DeepSeek-R1 if no match
      console.log(`Unknown model ID ${modelId}, defaulting to DeepSeek-R1`);
  }
  
  try {
    const response = await fetch('https://cloud.olakrutrim.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KRUTRIM_API_KEY}`
      },
      body: JSON.stringify({
        model: krutrimModelId, // Use the mapped model ID
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 25000, // High token limit as requested
      })
    });
    
    // Capture the full response as text for better debugging
    const responseText = await response.text();
    console.log(`Krutrim API response status: ${response.status}`);
    console.log(`Krutrim API response first 100 chars: ${responseText.substring(0, 100)}...`);
    
    if (!response.ok) {
      console.error(`Krutrim API error: ${response.status} - ${responseText}`);
      try {
        const error = JSON.parse(responseText);
        throw new Error(`Krutrim API error: ${response.status} - ${error.error?.message || error.error || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Krutrim API error: ${response.status} - ${responseText}`);
      }
    }
    
    // Parse response text to JSON only once
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log(`Successfully received response from Krutrim`);
      console.log(`Response structure: ${JSON.stringify(Object.keys(parsedResponse))}`);
    } catch (parseError) {
      console.error(`Failed to parse Krutrim response as JSON: ${responseText}`);
      throw new Error(`Invalid JSON response from Krutrim API: ${responseText.substring(0, 100)}...`);
    }
    
    // Validate the expected response structure before trying to use it
    if (parsedResponse.choices && 
        Array.isArray(parsedResponse.choices) && 
        parsedResponse.choices.length > 0 && 
        parsedResponse.choices[0].message && 
        parsedResponse.choices[0].message.content) {
      
      return new Response(
        JSON.stringify({ 
          content: parsedResponse.choices[0].message.content,
          model: modelId,
          provider: 'Krutrim'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If the response doesn't match what we expect, log it and throw a descriptive error
      console.error("Unexpected Krutrim response format:", parsedResponse);
      throw new Error(`Unexpected response format from Krutrim API. The API returned a successful status but the response doesn't match the expected structure.`);
    }
  } catch (error) {
    console.error("Error in Krutrim API call:", error);
    throw error;
  }
}

