
import { corsHeaders } from "../utils/cors.ts";

// Google (Gemini) handler
export async function handleGoogle(messageHistory: any[], content: string, modelId: string, systemPrompt: string) {
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
    // Add regular message history
    ...messageHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
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
    
    // Estimate token counts (Google doesn't always provide this)
    const inputTokensEstimate = Math.round((content.length + systemPrompt.length) / 4);
    const outputTokensEstimate = data.candidates && data.candidates[0] && data.candidates[0].content.parts[0] ? 
      Math.round(data.candidates[0].content.parts[0].text.length / 4) : 0;
    
    return new Response(
      JSON.stringify({ 
        content: data.candidates[0].content.parts[0].text,
        model: modelId,
        provider: 'Google',
        tokens: {
          input: data.usage?.promptTokenCount || inputTokensEstimate,
          output: data.usage?.candidatesTokenCount || outputTokensEstimate
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Google API call:", error);
    throw error;
  }
}
