
import { corsHeaders } from "../utils/cors.ts";

// OpenAI (DALL-E) image generation handler
export async function handleOpenAIImageGeneration(prompt: string, modelId: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing image generation request with prompt: ${prompt.substring(0, 50)}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3", // Using DALL-E 3 model
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI DALL-E API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully generated image with DALL-E");
    
    if (data.data && data.data.length > 0) {
      return new Response(
        JSON.stringify({
          imageUrl: data.data[0].url,
          revisedPrompt: data.data[0].revised_prompt,
          model: "dall-e-3",
          provider: 'OpenAI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected OpenAI DALL-E response format:", data);
      throw new Error("Unexpected response format from OpenAI DALL-E API");
    }
  } catch (error) {
    console.error("Error in OpenAI DALL-E API call:", error);
    throw error;
  }
}
