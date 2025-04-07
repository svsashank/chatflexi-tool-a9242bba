import { corsHeaders } from "../utils/cors.ts";

// Google (Gemini) handler
export async function handleGoogle(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images: string[] = []) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing request for Google model ${modelId} with content: ${content.substring(0, 50)}...`);
  console.log(`Has images: ${images.length > 0}, image count: ${images.length}`);
  
  // Format messages for Gemini, including system prompt
  const formattedContents = [
    // Add system prompt as a first user message
    {
      role: 'user',
      parts: [{ text: `System: ${systemPrompt}` }]
    }
  ];
  
  // Add message history (excluding the last user message which will be handled separately)
  for (const msg of messageHistory.slice(0, -1)) {
    if (msg.images && msg.images.length > 0 && msg.role === 'user') {
      const parts = [{ text: msg.content }];
      
      // Add each image
      for (const imageUrl of msg.images) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg", // Assume JPEG for simplicity
            data: imageUrl.replace(/^data:image\/[^;]+;base64,/, "") // Strip the data URL prefix if present
          }
        });
      }
      
      formattedContents.push({
        role: msg.role,
        parts: parts
      });
    } else {
      formattedContents.push({
        role: msg.role,
        parts: [{ text: msg.content }]
      });
    }
  }
  
  // Handle current message with images if present
  if (images.length > 0) {
    const parts = [{ text: content }];
    
    // Add each image
    for (const imageUrl of images) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg", // Assume JPEG for simplicity
          data: imageUrl.replace(/^data:image\/[^;]+;base64,/, "") // Strip the data URL prefix if present
        }
      });
    }
    
    formattedContents.push({
      role: 'user',
      parts: parts
    });
  } else {
    formattedContents.push({
      role: 'user',
      parts: [{ text: content }]
    });
  }

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

// Google (Imagen) image generation handler
export async function handleGoogleImageGeneration(prompt: string, modelId: string) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing image generation request with prompt: ${prompt.substring(0, 50)}...`);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/imagegeneration:generateImage?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          text: prompt
        },
        sampleCount: 1,
        sampleImageSize: "1024x1024"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Google Imagen API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully generated image with Google Imagen");
    
    if (data.images && data.images.length > 0) {
      return new Response(
        JSON.stringify({
          imageUrl: data.images[0],
          provider: 'Google',
          model: 'imagen'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected Google Imagen response format:", data);
      throw new Error("Unexpected response format from Google Imagen API");
    }
  } catch (error) {
    console.error("Error in Google Imagen API call:", error);
    throw error;
  }
}
