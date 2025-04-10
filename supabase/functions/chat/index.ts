
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
    const { content, model, messages, images, files } = await req.json();
    
    // Prepare conversation history in the format the APIs expect
    const messageHistory = messages || [];
    // Get any images that were attached to the message
    const messageImages = images || [];
    // Get any files that were attached to the message
    const messageFiles = files || [];
    
    console.log(`Request received for provider: ${model.provider}, model: ${model.id}`);
    if (messageImages && messageImages.length > 0) {
      console.log(`Request includes ${messageImages.length} images`);
    }
    if (messageFiles && messageFiles.length > 0) {
      console.log(`Request includes ${messageFiles.length} files`);
    }
    
    // Add a system prompt based on the conversation context
    const systemPrompt = generateSystemPrompt(messageHistory);
    
    // Format varies by provider
    try {
      let response;
      switch(model.provider.toLowerCase()) {
        case 'openai':
          // Check if this is an O-series reasoning model that needs special handling
          if (isOSeriesReasoningModel(model.id)) {
            response = await handleOpenAIReasoningModel(messageHistory, content, model.id, systemPrompt, messageImages);
          } else {
            response = await handleOpenAIStandard(messageHistory, content, model.id, systemPrompt, messageImages);
          }
          break;
        case 'anthropic':
          response = await handleAnthropic(messageHistory, content, model.id, systemPrompt, messageImages);
          break;
        case 'google':
          response = await handleGoogle(messageHistory, content, model.id, systemPrompt, messageImages);
          break;
        case 'xai':
          response = await handleXAI(messageHistory, content, model.id, systemPrompt, messageImages);
          break;
        case 'krutrim':
          response = await handleKrutrim(messageHistory, content, model.id, systemPrompt, messageImages);
          break;
        default:
          throw new Error(`Provider ${model.provider} not supported`);
      }
      
      // Validate that we got a proper response
      if (response) {
        return response;
      } else {
        throw new Error("Handler did not return a valid response");
      }
      
    } catch (handlerError) {
      console.error(`Handler error for ${model.provider}:`, handlerError);
      return new Response(
        JSON.stringify({ 
          content: `Error: ${handlerError.message || 'An unexpected error occurred'}`,
          model: model.id,
          provider: model.provider,
          tokens: { input: 0, output: 0 },
          webSearchResults: [],
          fileSearchResults: []
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
      JSON.stringify({ 
        content: `Sorry, an error occurred: ${error.message || 'An unexpected error occurred'}`,
        tokens: { input: 0, output: 0 },
        webSearchResults: [],
        fileSearchResults: []
      }),
      { 
        status: 200, // Return 200 even for errors to prevent client from breaking
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
