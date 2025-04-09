
import { corsHeaders } from "../utils/cors.ts";

// Anthropic (Claude) handler
export async function handleAnthropic(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images: string[] = []) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  // Log model ID to help with debugging
  console.log(`Processing request for Anthropic model ${modelId} with content: ${content.substring(0, 50)}...`);
  console.log(`Has images: ${images.length > 0}, image count: ${images.length}`);
  
  // Format messages for Anthropic API v1 format
  const messages = [];
  
  // Add message history - for Anthropic, we need to alternate user/assistant
  if (messageHistory.length > 0) {
    for (let i = 0; i < messageHistory.length; i++) {
      const msg = messageHistory[i];
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }
  }
  
  // Format the current message with images if present
  let userMessage = {
    role: 'user',
    content: []
  };
  
  // Add text content
  userMessage.content.push({
    type: "text",
    text: content
  });
  
  // Add images if present
  if (images && images.length > 0) {
    for (let image of images) {
      try {
        // Handle base64 image data
        if (image.startsWith('data:image/')) {
          // Extract the mime type and base64 data
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            console.error('Invalid image data format');
            continue;
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Add image to content array
          userMessage.content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Data
            }
          });
          
          console.log(`Added base64 image with mime type: ${mimeType}`);
        } else {
          console.log('Skipping non-base64 image, URL not supported');
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }
  
  // Replace the last user message or add a new one
  messages.push(userMessage);
  
  console.log(`Calling Anthropic API with model ${modelId}...`);
  console.log(`Messages count: ${messages.length}`);
  
  try {
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
        system: systemPrompt,
        max_tokens: 1000,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status} - ${errorText}`);
      try {
        const error = JSON.parse(errorText);
        throw new Error(`Anthropic API error: ${response.status} - ${error.error?.message || error.type || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log(`Successfully received response from Anthropic`);
    console.log(`Response structure: ${JSON.stringify(Object.keys(data))}`);
    
    // Extract token counts (estimated from character counts if not provided)
    // Anthropic doesn't always provide exact token counts, so this is an approximation
    const inputTokens = data.usage?.input_tokens || Math.round(content.length / 4);
    const outputTokens = data.usage?.output_tokens || 
      (data.content && Array.isArray(data.content) && data.content.length > 0) ? 
      Math.round(data.content[0].text.length / 4) : 0;
    
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      return new Response(
        JSON.stringify({ 
          content: data.content[0].text,
          model: modelId,
          provider: 'Anthropic',
          tokens: {
            input: inputTokens,
            output: outputTokens
          }
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
