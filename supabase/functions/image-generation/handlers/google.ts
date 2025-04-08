
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
    console.log(`Sending request to Google Imagen API with key: ${GOOGLE_API_KEY.substring(0, 3)}...`);
    
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
        sampleCount: 1,
        sampleImageSize: "1024x1024"
      })
    });
    
    // Check if the response is valid
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error response (${response.status}):`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `Google Imagen API error: ${response.status}`);
      } catch (parseError) {
        // If we can't parse the error as JSON, return the raw text
        throw new Error(`Google Imagen API error (${response.status}): ${errorText.substring(0, 200)}...`);
      }
    }
    
    // Get the response text first for debugging
    const responseText = await response.text();
    console.log("Google Imagen API raw response:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Parse the response as JSON, with error handling
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Google Imagen API response as JSON:", parseError);
      throw new Error("Invalid JSON response from Google Imagen API");
    }
    
    console.log("Successfully parsed Google Imagen response");
    
    // Extract the image URL from the response based on Google's API structure
    if (data.images && data.images.length > 0) {
      console.log("Image data found in response, returning result");
      return new Response(
        JSON.stringify({
          imageUrl: data.images[0],
          revisedPrompt: data.promptFeedback?.refinedPrompt,
          model: modelId,
          provider: 'Google'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected Google Imagen response format:", JSON.stringify(data));
      throw new Error("Could not extract image URL from Google Imagen response");
    }
  } catch (error) {
    console.error("Error in Google Imagen API call:", error);
    throw error;
  }
}
