
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { corsHeaders } from "./utils/cors.ts";
import { generateSystemPrompt } from "./utils/context.ts";

// Import handlers for different model providers
import { handleOpenAIStandard, handleOpenAIReasoningModel, isOSeriesReasoningModel } from "./handlers/openai.ts";
import { handleAnthropic } from "./handlers/anthropic.ts";
import { handleGoogle } from "./handlers/google.ts";
import { handleXAI } from "./handlers/xai.ts";
import { handleKrutrim } from "./handlers/krutrim.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, model, messages, images } = await req.json();
    
    // Prepare conversation history in the format the APIs expect
    const messageHistory = messages || [];
    // Get any images that were attached to the message
    const messageImages = images || [];
    
    console.log(`Request received for provider: ${model.provider}, model: ${model.id}`);
    if (messageImages && messageImages.length > 0) {
      console.log(`Request includes ${messageImages.length} images`);
    }
    
    // Add a system prompt based on the conversation context
    const systemPrompt = generateSystemPrompt(messageHistory);
    
    // Format varies by provider
    try {
      switch(model.provider.toLowerCase()) {
        case 'openai':
          // Check if this is an O-series reasoning model that needs special handling
          if (isOSeriesReasoningModel(model.id)) {
            return await handleOpenAIReasoningModel(messageHistory, content, model.id, systemPrompt, messageImages);
          } else {
            return await handleOpenAIStandard(messageHistory, content, model.id, systemPrompt, messageImages);
          }
        case 'anthropic':
          return await handleAnthropic(messageHistory, content, model.id, systemPrompt, messageImages);
        case 'google':
          return await handleGoogle(messageHistory, content, model.id, systemPrompt, messageImages);
        case 'xai':
          return await handleXAI(messageHistory, content, model.id, systemPrompt, messageImages);
        case 'krutrim':
          return await handleKrutrim(messageHistory, content, model.id, systemPrompt, messageImages);
        default:
          throw new Error(`Provider ${model.provider} not supported`);
      }
    } catch (handlerError) {
      console.error(`Handler error for ${model.provider}:`, handlerError);
      return new Response(
        JSON.stringify({ 
          content: `Error: ${handlerError.message || 'An unexpected error occurred'}`,
          model: model.id,
          provider: model.provider,
          tokens: { input: 0, output: 0 }
        }),
        { 
          status: 200,  // Return 200 even for errors to prevent client from breaking 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error(`Error in chat function:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
