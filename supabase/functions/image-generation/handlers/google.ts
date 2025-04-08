
import { corsHeaders } from "../utils/cors.ts";

// Google Imagen image generation handler
export async function handleGoogleImageGeneration(prompt: string, modelId: string) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing image generation request with Google model ${modelId} and prompt: ${prompt.substring(0, 50)}...`);
  
  try {
    // Important: For Gemini models, we need to check which models support image generation
    // According to Google docs, only imagen-3 and imagen-4 officially support generation
    const isGemini = modelId.toLowerCase().includes('gemini');
    
    // Determine which API to use based on the model
    let apiEndpoint = '';
    let requestBody = {};
    let isImageGenerationSupported = true;
    
    if (isGemini) {
      // According to Google documentation, standard Gemini models don't support image generation
      // We'll use the Imagen models for image generation instead
      console.log("Gemini models don't natively support image generation. Using Imagen model instead.");
      isImageGenerationSupported = false;
      
      // Use Imagen API for image generation
      apiEndpoint = `https://generativelanguage.googleapis.com/v1/models/imagegeneration@002:generateContent?key=${GOOGLE_API_KEY}`;
      
      requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      };
    } else {
      // Fall back to Imagen API for other Google models
      apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagegeneration@005:generateImage?key=${GOOGLE_API_KEY}`;
      
      requestBody = {
        prompt: {
          text: prompt
        },
        sampleCount: 1,
        sampleImageSize: "1024x1024"
      };
    }
    
    console.log(`Using API endpoint: ${apiEndpoint.substring(0, 80)}...`);
    console.log(`Request body structure: ${JSON.stringify(requestBody, null, 2).substring(0, 200)}...`);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check if the response is valid
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error response (${response.status}):`, errorText);
      
      if (!isImageGenerationSupported) {
        throw new Error("This Gemini model doesn't support image generation. Try using OpenAI's DALL-E models instead.");
      }
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
      } catch (parseError) {
        // If we can't parse the error as JSON, return the raw text
        throw new Error(`Google API error (${response.status}): ${errorText.substring(0, 200)}...`);
      }
    }
    
    // Get the response as JSON
    const data = await response.json();
    console.log("Google API response structure:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
    
    let imageUrl = null;
    let imageGenerated = false;
    
    // Extract image URL based on model and API type
    if (isGemini && data.candidates && data.candidates[0]?.content?.parts) {
      // Processing response from imagegeneration model used instead of Gemini
      const parts = data.candidates[0].content.parts;
      
      for (const part of parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          imageGenerated = true;
          console.log("Found image in inlineData");
          break;
        }
      }
    } else {
      // For Imagen directly
      if (data.images && data.images.length > 0) {
        imageUrl = `data:image/png;base64,${data.images[0]}`;
        imageGenerated = true;
      } else if (data.image) {
        imageUrl = `data:image/png;base64,${data.image}`;
        imageGenerated = true;
      }
    }
    
    if (!imageGenerated || !imageUrl) {
      console.error("Failed to extract image from response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Failed to extract image from Google API response");
    }
    
    console.log("Successfully extracted image URL from Google API response");
    
    return new Response(
      JSON.stringify({
        imageUrl: imageUrl,
        revisedPrompt: data.promptFeedback?.refinedPrompt || null,
        model: "imagen", // Use the actual model that generated the image
        provider: 'Google'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Google API call:", error);
    throw error;
  }
}
