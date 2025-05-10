
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const BFL_API_KEY = Deno.env.get('BFL_API_KEY');

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

// Handle Flux model image generation via Blackforest Labs API
async function generateWithFlux(prompt: string, model: string, size = "1024x1024", quality = "standard") {
  console.log(`Generating image with Flux model (${model}): ${prompt} with size ${size} and quality ${quality}`);
  
  if (!BFL_API_KEY) {
    throw new Error('Blackforest Labs API key is not configured');
  }
  
  try {
    // Parse size to get dimensions
    const [width, height] = size.split('x').map(dim => parseInt(dim, 10));
    
    // Determine which API endpoint to use based on the model
    const apiEndpoint = model === 'flux-1-schnell' 
      ? 'https://api.us1.bfl.ai/v1/flux-1' 
      : 'https://api.us1.bfl.ai/v1/flux-pro-1.1';
    
    console.log(`Using API endpoint: ${apiEndpoint}`);
    
    // Set up the request body based on model and quality
    const requestBody: any = {
      prompt,
      width,
      height
    };
    
    // Add quality-specific parameters
    if (quality === 'high' && model === 'flux-pro-1.1') {
      requestBody.num_inference_steps = 75;
      requestBody.guidance_scale = 8.5;
    }
    
    console.log(`Request payload:`, requestBody);
    
    // Step 1: Request image generation
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'x-key': BFL_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blackforest Labs API error response:', errorText);
      throw new Error(`Blackforest Labs API error: ${errorText}`);
    }
    
    // Get the request ID from the initial response
    const responseData = await response.json();
    const requestId = responseData.id;
    
    if (!requestId) {
      throw new Error('Blackforest Labs API did not return a request ID');
    }
    
    console.log(`Image generation started with request ID: ${requestId}`);
    
    // Step 2: Poll for the result
    let result;
    let attempts = 0;
    const maxAttempts = 30; // Maximum number of polling attempts
    const pollingInterval = 1000; // 1 second between polls
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const statusResponse = await fetch(`https://api.us1.bfl.ai/v1/status/${requestId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-key': BFL_API_KEY,
        },
      });
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`Status check error (attempt ${attempts}):`, errorText);
        
        if (attempts === maxAttempts) {
          throw new Error(`Failed to get image status after ${maxAttempts} attempts`);
        }
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        continue;
      }
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'succeeded') {
        console.log('Image generation succeeded');
        result = statusData;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(`Image generation failed: ${statusData.error || 'Unknown error'}`);
      } else {
        console.log(`Image still generating, status: ${statusData.status}, attempt: ${attempts}`);
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }
    
    if (!result) {
      throw new Error('Image generation timed out');
    }
    
    // Return the image data
    return [{
      url: result.url,
      revised_prompt: prompt
    }];
  } catch (error) {
    console.error('Flux model error:', error);
    throw new Error(`Flux model API error: ${error.message || 'Unknown error'}`);
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
        
      case 'flux':
        if (!BFL_API_KEY) {
          throw new Error('Blackforest Labs API key not configured');
        }
        result = await generateWithFlux(prompt, model, size, quality);
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
