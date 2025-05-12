
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Key
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Handle OpenAI image generation
async function generateWithOpenAI(prompt: string, model = "dall-e-3", size = "1024x1024", quality = "standard", style = "vivid", n = 1) {
  console.log(`Generating image with OpenAI: ${prompt}`);
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  
  try {
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

    if (!response.ok) {
      const data = await response.json();
      console.error("OpenAI error details:", data);
      throw new Error(`OpenAI API error: ${data.error?.message || JSON.stringify(data) || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('OpenAI returned no image data');
    }
    
    console.log(`Successfully generated ${data.data.length} image(s) with OpenAI`);
    
    return data.data.map((image: any) => ({
      url: image.url,
      revised_prompt: image.revised_prompt
    }));
  } catch (error) {
    console.error('OpenAI generation error:', error);
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
    console.log("Received image generation request");
    const { prompt, provider, model, size, quality, style, n } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Ensure we're only using OpenAI
    if (provider.toLowerCase() !== 'openai') {
      return new Response(
        JSON.stringify({ error: 'Only OpenAI provider is supported' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Processing image generation request with model: ${model}, size: ${size}`);
    
    const result = await generateWithOpenAI(prompt, model, size, quality, style, n);
    
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
