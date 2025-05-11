
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
    
    // Determine the model name for the API endpoint
    let modelName = model;
    if (model === 'flux-1-schnell') {
      modelName = 'flux-1';
    } else if (model === 'flux-pro-1.1') {
      modelName = 'flux-pro-1.1';
    }
    
    // Use the correct scalar API endpoint
    const apiEndpoint = `https://api.us1.bfl.ai/scalar/inference/${modelName}`;
    
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
    
    // Get the task ID from the initial response
    const responseData = await response.json();
    const taskId = responseData.id;
    
    if (!taskId) {
      throw new Error('Blackforest Labs API did not return a task ID');
    }
    
    console.log(`Image generation started with task ID: ${taskId}`);
    
    // Step 2: Poll for the result with exponential backoff
    let result;
    let attempts = 0;
    const maxAttempts = 30; // Maximum number of polling attempts
    let pollingInterval = 1000; // Starting with 1 second between polls
    const maxPollingInterval = 5000; // Maximum polling interval (5 seconds)
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Use the correct scalar tasks endpoint
      const statusResponse = await fetch(`https://api.us1.bfl.ai/scalar/tasks/${taskId}`, {
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
        
        // Exponential backoff with a maximum interval
        pollingInterval = Math.min(pollingInterval * 1.5, maxPollingInterval);
        console.log(`Retrying in ${pollingInterval}ms...`);
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log(`Task status (attempt ${attempts}):`, statusData.status);
      
      if (statusData.status === 'succeeded') {
        console.log('Image generation succeeded');
        result = statusData;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(`Image generation failed: ${statusData.error || 'Unknown error'}`);
      } else {
        console.log(`Image still generating, status: ${statusData.status}, attempt: ${attempts}`);
        
        // Gradually increase polling interval with each attempt
        pollingInterval = Math.min(pollingInterval * 1.2, maxPollingInterval);
        console.log(`Next check in ${pollingInterval}ms`);
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }
    
    if (!result) {
      throw new Error('Image generation timed out');
    }
    
    // Extract the image URL from the result
    if (!result.output?.default) {
      throw new Error('No image URL found in the completed task');
    }
    
    // Return the image data
    return [{
      url: result.output.default,
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
