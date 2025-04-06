
import { corsHeaders } from "../utils/cors.ts";

// xAI (Grok) handler
export async function handleXAI(messageHistory: any[], content: string, modelId: string, systemPrompt: string) {
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
    
    // Try to parse the response as JSON to better handle errors
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log(`Successfully received response from xAI`);
      console.log(`xAI response structure: ${JSON.stringify(Object.keys(parsedResponse))}`);
    } catch (parseError) {
      console.error(`Failed to parse xAI response as JSON: ${responseText}`);
      throw new Error(`Invalid JSON response from xAI API: ${responseText.substring(0, 100)}...`);
    }
    
    // Check for authentication errors
    if (parsedResponse.code === 401 || !response.ok) {
      if (parsedResponse.msg) {
        // This captures the Chinese error message we saw in the logs
        console.error(`xAI authentication error: ${parsedResponse.msg}`);
        throw new Error(`xAI API authentication failed. Please check your API key and permissions. Error code: ${parsedResponse.code || response.status}`);
      } else if (parsedResponse.error) {
        console.error(`xAI API error: ${JSON.stringify(parsedResponse.error)}`);
        throw new Error(`xAI API error: ${parsedResponse.error.message || 'Unknown error'}`);
      } else {
        throw new Error(`xAI API returned status ${response.status}: ${responseText.substring(0, 100)}`);
      }
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
          provider: 'xAI',
          tokens: {
            input: parsedResponse.usage?.prompt_tokens || Math.round((content.length + systemPrompt.length) / 4),
            output: parsedResponse.usage?.completion_tokens || 
              (parsedResponse.choices && parsedResponse.choices[0] && parsedResponse.choices[0].message) ?
              Math.round(parsedResponse.choices[0].message.content.length / 4) : 0
          }
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
