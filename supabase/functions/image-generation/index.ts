
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { corsHeaders } from "../chat/utils/cors.ts";
import { handleOpenAIImageGeneration } from "./handlers/openai.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, provider, modelId, enhancePrompt, imageUrl } = await req.json();
    
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt is required');
    }
    
    console.log(`Processing image generation request with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    console.log(`Provider: ${provider}, Model: ${modelId}, Enhance: ${enhancePrompt}`);
    
    if (imageUrl) {
      console.log(`Image URL is provided as input reference`);
    }
    
    // Route to appropriate provider handler
    switch(provider.toLowerCase()) {
      case 'openai':
        return await handleOpenAIImageGeneration(prompt, modelId || 'dall-e-3', enhancePrompt, imageUrl);
      default:
        throw new Error(`Provider ${provider} not supported for image generation`);
    }
  } catch (error) {
    console.error(`Error in image generation function:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during image generation' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
