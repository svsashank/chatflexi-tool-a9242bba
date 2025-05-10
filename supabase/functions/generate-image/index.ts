
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const HUGGING_FACE_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

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

// Handle Flux model image generation via Hugging Face
async function generateWithFlux(prompt: string, model: string, size = "1024x1024", quality = "standard") {
  console.log(`Generating image with Flux model (${model}): ${prompt} with size ${size} and quality ${quality}`);
  
  if (!HUGGING_FACE_TOKEN) {
    throw new Error('Hugging Face access token is not configured');
  }
  
  try {
    const hf = new HfInference(HUGGING_FACE_TOKEN);
    
    // Parse size to get dimensions
    const [width, height] = size.split('x').map(dim => parseInt(dim, 10));
    
    // Set parameters based on model and quality
    let parameters: any = {
      negative_prompt: "low quality, blurry"
    };
    
    // Configure model-specific parameters
    if (model === 'black-forest-labs/FLUX.1-schnell') {
      parameters = {
        ...parameters,
        guidance_scale: 7.5,
        num_inference_steps: 50
      };
    } else if (model === 'black-forest-labs/FLUX.1.1-pro') {
      // Higher quality settings for the pro model
      parameters = {
        ...parameters,
        guidance_scale: quality === 'high' ? 8.5 : 7.5,
        num_inference_steps: quality === 'high' ? 75 : 50,
        width: width,
        height: height
      };
    }
    
    console.log(`Using Flux parameters:`, parameters);
    
    // Use the textToImage method according to the Blackforest Labs documentation
    const blob = await hf.textToImage({
      inputs: prompt,
      model: model,
      parameters: parameters
    });
    
    // Convert the blob to a base64 string for data URL
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    return [{
      url: dataUrl,
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
        if (!HUGGING_FACE_TOKEN) {
          throw new Error('Hugging Face access token not configured');
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
