
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
    
    // Format varies by provider
    switch(model.provider.toLowerCase()) {
      case 'openai':
        return await handleOpenAI(messageHistory, content, model.id);
      case 'anthropic':
        return await handleAnthropic(messageHistory, content, model.id);
      case 'google':
        return await handleGoogle(messageHistory, content, model.id);
      case 'xai':
        return await handleXAI(messageHistory, content, model.id);
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

// OpenAI (GPT) handler
async function handleOpenAI(messageHistory, content, modelId) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for OpenAI
  const formattedMessages = [
    ...messageHistory.map(msg => ({
      role: msg.role,
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
async function handleAnthropic(messageHistory, content, modelId) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  console.log(`Processing request for Anthropic model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Valid Claude model names as of April 2024
  const validClaudeModels = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-2.1',
    'claude-2.0',
    'claude-instant-1.2'
  ];
  
  // Check if the model ID is valid
  if (!validClaudeModels.includes(modelId)) {
    console.warn(`Warning: Potentially invalid Claude model ID: ${modelId}`);
    console.log(`Available Claude models: ${validClaudeModels.join(', ')}`);
  }
  
  // Convert from chat format to messages format for Anthropic API
  const messages = [
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    })),
    { role: 'user', content }
  ];
  
  console.log(`Calling Anthropic API with model ${modelId}...`);
  console.log(`Messages count: ${messages.length}`);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: 1000,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status}`, errorText);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
      } catch (e) {
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }
    }
    
    console.log(`Successfully received response from Anthropic`);
    const data = await response.json();
    
    // Log the response structure for debugging
    console.log(`Anthropic response type: ${typeof data}`);
    console.log(`Anthropic response content type: ${typeof data.content}`);
    console.log(`Anthropic response structure: ${JSON.stringify(Object.keys(data))}`);
    
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
async function handleGoogle(messageHistory, content, modelId) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing request for Google model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for Gemini
  const formattedContents = messageHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  // Add the current message
  formattedContents.push({
    role: 'user',
    parts: [{ text: content }]
  });

  console.log(`Calling Google API...`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GOOGLE_API_KEY}`, {
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
}

// xAI (Grok) handler
async function handleXAI(messageHistory, content, modelId) {
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  if (!XAI_API_KEY) {
    throw new Error("xAI API key not configured");
  }
  
  console.log(`Processing request for xAI model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for xAI
  const formattedMessages = [
    ...messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content }
  ];

  console.log(`Calling xAI API...`);
  const response = await fetch('https://api.xai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`xAI API error: ${response.status}`, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error?.message || `xAI API error: ${response.status}`);
    } catch (e) {
      throw new Error(`xAI API error: ${response.status} - ${errorText}`);
    }
  }
  
  console.log(`Successfully received response from xAI`);
  const data = await response.json();
  return new Response(
    JSON.stringify({ 
      content: data.choices[0].message.content,
      model: modelId,
      provider: 'xAI'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
