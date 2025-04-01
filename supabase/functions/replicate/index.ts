
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

    // Determine the model version ID based on the model ID
    const modelVersionMap = {
      'llama-3-8b': 'meta/llama-3-8b:dd2c4223f0436eb80d5602e52d9b3f1725522b3d09e9d1bd642d3b7d758bd1c6',
      'llama-3-70b': 'meta/llama-3-70b-instruct:2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566c7e',
      'deepseek-r1': 'deepseek-ai/deepseek-r1:c819f63eb4bab0e44ab0beb69196da3ef1975a53991d45deada3019680e42c1d'
    };
    
    const modelVersionId = modelVersionMap[modelId];
    if (!modelVersionId) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }

    // Format the conversation history for Replicate
    const formattedPrompt = formatConversationForReplicate(messages, system_prompt, modelId);
    
    console.log(`Calling Replicate API for ${modelId}...`);
    console.log(`Using model version: ${modelVersionId}`);
    
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${REPLICATE_API_KEY}`
      },
      body: JSON.stringify({
        version: modelVersionId,
        input: {
          prompt: formattedPrompt,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
        }
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

    // Return the result
    return new Response(
      JSON.stringify({ 
        content: result.output || "",
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
  // For DeepSeek R1, we'll use a different format
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
