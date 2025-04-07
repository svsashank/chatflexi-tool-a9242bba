
import { corsHeaders } from "../utils/cors.ts";

// Google Imagen image generation handler
export async function handleGoogleImageGeneration(prompt: string, modelId: string) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing image generation request with Google's ${modelId} model and prompt: ${prompt.substring(0, 50)}...`);
  
  const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generateImage";
  
  try {
    const response = await fetch(`${apiEndpoint}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: {
          text: prompt
        },
        // Additional parameters can be added here as needed
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Google Imagen API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully generated image with Google Imagen");
    
    // Extract the image URL from the response based on Google's API structure
    // Note: The actual response structure might differ, adjust accordingly
    if (data.image && data.image.url) {
      return new Response(
        JSON.stringify({
          imageUrl: data.image.url,
          revisedPrompt: data.promptFeedback?.refinedPrompt,
          model: modelId,
          provider: 'Google'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected Google Imagen response format:", data);
      throw new Error("Could not extract image URL from Google Imagen response");
    }
  } catch (error) {
    console.error("Error in Google Imagen API call:", error);
    throw error;
  }
}
