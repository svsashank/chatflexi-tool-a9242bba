
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
  let systemMessage = systemPrompt;
  
  // For Claude 3, we can directly use the system message parameter
  const messages = [];
  
  // Add message history - for Anthropic, we need to alternate user/assistant
  if (messageHistory.length > 0) {
    const formattedHistory = [];
    for (let i = 0; i < messageHistory.length; i++) {
      const msg = messageHistory[i];
      
      if (msg.images && msg.images.length > 0 && msg.role === 'user') {
        // For messages with images, we need to use the content format
        const content = [];
        
        // Add the text part
        content.push({
          type: "text",
          text: msg.content
        });
        
        // Add image URLs as image parts
        for (const imageUrl of msg.images) {
          content.push({
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
              media_type: "image/jpeg" // Assume JPEG for simplicity
            }
          });
        }
        
        formattedHistory.push({
          role: 'user',
          content: content
        });
      } else {
        // For text-only messages, use the simple format
        formattedHistory.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }
    messages.push(...formattedHistory);
  }
  
  // Format the current message (which might have images)
  if (images.length > 0) {
    const contentArray = [];
    
    // Add the text part
    contentArray.push({
      type: "text",
      text: content
    });
    
    // Add image URLs as image parts
    for (const imageUrl of images) {
      contentArray.push({
        type: "image",
        source: {
          type: "url",
          url: imageUrl,
          media_type: "image/jpeg" // Assume JPEG for simplicity
        }
      });
    }
    
    messages.push({
      role: 'user',
      content: contentArray
    });
  } else {
    messages.push({
      role: 'user',
      content: content
    });
  }
  
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
