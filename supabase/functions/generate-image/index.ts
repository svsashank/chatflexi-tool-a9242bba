
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

// Handle OpenAI image generation
async function generateWithOpenAI(prompt: string, model = "dall-e-3", size = "1024x1024", quality = "standard", style = "vivid", n = 1) {
  console.log(`Generating image with OpenAI: ${prompt}`);
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      model,
      n,
      size,
      quality,
      style,
      response_format: "url"
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("OpenAI error:", data);
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.data.map((image: any) => ({
    url: image.url,
    revised_prompt: image.revised_prompt
  }));
}

// Handle Google image generation with Imagen 3
async function generateWithGoogle(prompt: string) {
  console.log(`Generating image with Google Imagen: ${prompt}`);
  
  // Updated endpoint for Google's Imagen 3
  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/imagegeneration@002:generateImage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      prompt: {
        text: prompt
      },
      // Imagen 3 parameters
      sampleCount: 1,
      sampleImageSize: "1024x1024"
    }),
  });

  // Enhanced error handling with more detailed logging
  try {
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Google Imagen API error response:", data);
      console.error("Response status:", response.status);
      throw new Error(`Google API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    // Extract image from the response - log the shape of the response to debug
    console.log("Google Imagen API response structure:", Object.keys(data));
    
    if (data.images && data.images.length > 0 && data.images[0].base64Data) {
      return [{
        url: `data:image/png;base64,${data.images[0].base64Data}`,
        revised_prompt: prompt
      }];
    } else {
      console.error("Unexpected Google Imagen API response shape:", data);
      throw new Error('No image data was found in the Google Imagen response');
    }
  } catch (error) {
    console.error("Failed to parse Google Imagen API response:", error);
    throw error;
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { prompt, provider, model, size, quality, style, n } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    let result;
    
    // Route to the appropriate provider
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }
        result = await generateWithOpenAI(prompt, model, size, quality, style, n);
        break;
        
      case 'google':
        if (!GOOGLE_API_KEY) {
          throw new Error('Google API key not configured');
        }
        result = await generateWithGoogle(prompt);
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported provider' }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
    
    return new Response(
      JSON.stringify({ images: result }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
