
import { corsHeaders } from "../utils/cors.ts";

// Google Imagen image generation handler
export async function handleGoogleImageGeneration(prompt: string, modelId: string) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing image generation request with Google's ${modelId} model and prompt: ${prompt.substring(0, 50)}...`);
  
  try {
    // For Gemini models, we need to use the generativeLanguage API
    // The endpoint changed based on the Gemini version
    const isGemini = modelId.toLowerCase().includes('gemini');
    let apiEndpoint = '';
    let requestBody = {};
    
    if (isGemini) {
      // Use the appropriate API endpoint for Gemini models
      apiEndpoint = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${GOOGLE_API_KEY}`;
      
      requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "text/plain", data: "" } } // This triggers image generation mode
            ]
          }
        ],
        generation_config: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      };
    } else {
      // Fall back to Imagen API for other Google models
      apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generateImage?key=${GOOGLE_API_KEY}`;
      
      requestBody = {
        prompt: {
          text: prompt
        },
        sampleCount: 1,
        sampleImageSize: "1024x1024"
      };
    }
    
    console.log(`Sending request to Google API: ${apiEndpoint.substring(0, 80)}...`);
    
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
    console.log("Google API response structure:", JSON.stringify(data).substring(0, 300) + "...");
    
    let imageUrl = null;
    
    // Extract image URL based on model type
    if (isGemini) {
      // For Gemini models, the image is in the response content
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (!imageUrl) {
        console.error("Could not find image data in Gemini response:", JSON.stringify(data).substring(0, 500));
        throw new Error("No image data found in the Gemini response");
      }
    } else {
      // For Imagen, the image URL is directly in the response
      if (data.images && data.images.length > 0) {
        imageUrl = data.images[0];
      } else {
        console.error("No images found in response:", JSON.stringify(data).substring(0, 500));
        throw new Error("No images found in the Google Imagen response");
      }
    }
    
    console.log("Successfully extracted image URL from Google API response");
    
    return new Response(
      JSON.stringify({
        imageUrl: imageUrl,
        revisedPrompt: data.promptFeedback?.refinedPrompt || null,
        model: modelId,
        provider: 'Google'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Google API call:", error);
    throw error;
  }
}
