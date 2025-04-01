
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error("Replicate API key not configured");
    }

    const { modelId, messages, system_prompt } = await req.json();
    
    console.log(`Processing request for Replicate model ${modelId}`);

    // Format the conversation history for Replicate
    const formattedPrompt = formatConversationForReplicate(messages, system_prompt, modelId);
    
    // Map model IDs to their Replicate model version IDs
    // These are the specific version IDs that Replicate requires
    const versionMap = {
      'llama-3-8b': "8e6975e5ed6174911a6ff3d60540dfd4844201974602551e10e9e87ab143d81e", // meta/llama-3-8b
      'llama-3-70b': "2c1608e18606fad2812020dc541930f2d0495ce32eee50074220b87300bc16e1", // meta/llama-3-70b-instruct
      'deepseek-r1': "52fbdca5a244796b2422e7fddb75868fa3bc73b0ceeaa7018b99ea4a7187fa57" // deepseek-ai/deepseek-r1
    };
    
    const versionId = versionMap[modelId];
    if (!versionId) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }
    
    console.log(`Calling Replicate API for ${modelId}...`);
    console.log(`Using version ID: ${versionId}`);
    
    // Prepare the input based on the model
    let inputData = {};
    
    if (modelId === 'deepseek-r1') {
      // DeepSeek R1 expects just a "prompt" parameter
      inputData = {
        prompt: formattedPrompt
      };
    } else {
      // Other models might expect more parameters
      inputData = {
        prompt: formattedPrompt,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      };
    }
    
    console.log(`Input data for ${modelId}:`, JSON.stringify(inputData));
    
    // Call the Replicate API with version instead of model
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${REPLICATE_API_KEY}`
      },
      body: JSON.stringify({
        // Use version parameter instead of model
        version: versionId,
        input: inputData
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Replicate API error: ${response.status}`, errorData);
      throw new Error(`Replicate API error: ${response.status} - ${errorData}`);
    }

    const prediction = await response.json();
    console.log("Prediction created:", prediction.id);

    // Poll for the result
    let result = prediction;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${REPLICATE_API_KEY}`
        }
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Error polling prediction: ${pollResponse.status}`);
      }
      
      result = await pollResponse.json();
      console.log("Prediction status:", result.status);
    }

    if (result.status === "failed") {
      throw new Error(`Prediction failed: ${result.error || "Unknown error"}`);
    }

    // Return the result - handle the output format correctly
    // For DeepSeek R1, the output is typically a string
    let content = "";
    if (Array.isArray(result.output)) {
      content = result.output.join("");
    } else {
      content = result.output || "";
    }
    
    console.log(`Successfully processed ${modelId} response. Output format:`, typeof content);

    return new Response(
      JSON.stringify({ 
        content: content,
        model: modelId,
        provider: 'Replicate'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`Error in replicate function:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Format conversations for different Replicate models
function formatConversationForReplicate(messages, systemPrompt, modelId) {
  if (modelId.includes('llama')) {
    return formatForLlama(messages, systemPrompt);
  } else if (modelId.includes('deepseek')) {
    return formatForDeepSeek(messages, systemPrompt);
  }
  
  // Default format if model is not specifically handled
  return formatForLlama(messages, systemPrompt);
}

// Format for Llama models
function formatForLlama(messages, systemPrompt) {
  let prompt = systemPrompt ? `<|system|>\n${systemPrompt}\n` : "";
  
  for (const message of messages) {
    if (message.role === "user") {
      prompt += `<|user|>\n${message.content}\n`;
    } else if (message.role === "assistant") {
      prompt += `<|assistant|>\n${message.content}\n`;
    }
  }
  
  // Add the final assistant prefix to indicate we want a response
  prompt += `<|assistant|>\n`;
  
  return prompt;
}

// Format for DeepSeek models
function formatForDeepSeek(messages, systemPrompt) {
  // For DeepSeek R1, use the format from the Replicate documentation
  let prompt = "";
  
  if (systemPrompt) {
    prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  }
  
  for (const message of messages) {
    if (message.role === "user") {
      prompt += `<|im_start|>user\n${message.content}<|im_end|>\n`;
    } else if (message.role === "assistant") {
      prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n`;
    }
  }
  
  // Add the final assistant prefix to indicate we want a response
  prompt += `<|im_start|>assistant\n`;
  
  return prompt;
}
