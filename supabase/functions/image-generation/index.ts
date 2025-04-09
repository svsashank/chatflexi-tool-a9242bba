
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { corsHeaders } from "./utils/cors.ts";
import { handleOpenAIImageGeneration } from "./handlers/openai.ts";
import { handleGoogleImageGeneration } from "./handlers/google.ts";

// We're creating a stub for Anthropic handler since it's not fully implemented
const handleAnthropicImageGeneration = async (prompt: string, modelId: string) => {
  throw new Error("Anthropic image generation not implemented yet");
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, provider, modelId, enhancePrompt = true } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt parameter" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!provider) {
      return new Response(
        JSON.stringify({ error: "Missing provider parameter" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Image generation request received for provider: ${provider}, model: ${modelId}, prompt: ${prompt.substring(0, 50)}...`);
    console.log(`Prompt enhancement is ${enhancePrompt ? 'enabled' : 'disabled'}`);
    
    try {
      switch(provider.toLowerCase()) {
        case 'openai':
          return await handleOpenAIImageGeneration(prompt, modelId || 'dall-e-3', enhancePrompt);
        case 'google':
          // For Google/Gemini, we'll use their Imagen model regardless of what model was selected
          console.log(`Calling Google handler for model ${modelId} with prompt: ${prompt.substring(0, 30)}...`);
          const googleResponse = await handleGoogleImageGeneration(prompt, modelId || 'imagen', enhancePrompt);
          console.log(`Google handler completed successfully`);
          return googleResponse;
        case 'anthropic':
          return await handleAnthropicImageGeneration(prompt, modelId);
        default:
          throw new Error(`Provider ${provider} does not support image generation`);
      }
    } catch (handlerError) {
      console.error(`Handler error for ${provider}:`, handlerError);
      return new Response(
        JSON.stringify({ 
          error: `Error: ${handlerError.message || 'An unexpected error occurred'}`
        }),
        { 
          status: 200,  // Return 200 even for errors to prevent client from breaking 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error(`Error in image-generation function:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
