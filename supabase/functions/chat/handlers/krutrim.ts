
import { corsHeaders } from "../utils/cors.ts";

// Krutrim API handler for DeepSeek-R1
export async function handleKrutrim(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images?: string[]) {
  const KRUTRIM_API_KEY = Deno.env.get('KRUTRIM_API_KEY');
  if (!KRUTRIM_API_KEY) {
    throw new Error("Krutrim API key not configured. Please add your Krutrim API key in the Supabase settings.");
  }
  
  console.log(`Processing request for Krutrim model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format messages for Krutrim API
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content }
  ];

  console.log(`Calling Krutrim API with model ${modelId}...`);
  console.log(`Number of messages: ${formattedMessages.length}`);
  
  try {
    const response = await fetch('https://cloud.olakrutrim.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KRUTRIM_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1", // Hardcoded as per requirement
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 25000, // Increased from 1000 to 25000 as requested
      })
    });
    
    // Capture the full response as text first for better debugging
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
          provider: 'Krutrim',
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
      console.error("Unexpected Krutrim response format:", parsedResponse);
      throw new Error(`Unexpected response format from Krutrim API. The API returned a successful status but the response doesn't match the expected structure.`);
    }
  } catch (error) {
    console.error("Error in Krutrim API call:", error);
    throw error;
  }
}
