import { corsHeaders } from "../utils/cors.ts";

// O-series reasoning models from OpenAI that require special handling
const oSeriesReasoningModels = [
  'o1',
  'o1-mini',
  'o3-mini',
  'o1-pro',
];

// OpenAI O-series Reasoning Models handler (o1, o1-mini, o3-mini, o1-pro)
export async function handleOpenAIReasoningModel(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images: string[] = []) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for OpenAI reasoning model ${modelId} with content: ${content.substring(0, 50)}...`);
  
  // Format input for the responses API - this is different from chat completions
  const formattedInput = [
    // First add the system message
    { role: 'system', content: systemPrompt }
  ];
  
  // Add message history, but skip the last user message as we'll add that separately
  const historyWithoutLastUserMessage = messageHistory.slice(0, -1);
  formattedInput.push(
    ...historyWithoutLastUserMessage.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  );
  
  // Add the current user message
  formattedInput.push({ role: 'user', content });

  console.log(`Calling OpenAI responses API for reasoning model ${modelId}...`);
  console.log(`Request format: ${JSON.stringify({
    model: modelId,
    input: formattedInput.slice(0, 2), // Only show first two messages for logging
    reasoning: { effort: "high" }
  }, null, 2)}`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'responses=v1' // Required for the responses API
      },
      body: JSON.stringify({
        model: modelId,
        input: formattedInput,
        reasoning: { effort: "high" } // Using high effort for best results
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`OpenAI responses API error (${response.status}):`, error);
      throw new Error(error.error?.message || `OpenAI responses API error: ${response.status}`);
    }
    
    console.log(`Successfully received response from OpenAI reasoning model ${modelId}`);
    const data = await response.json();
    console.log(`Response structure: ${JSON.stringify(Object.keys(data))}`);
    console.log(`Full response data: ${JSON.stringify(data, null, 2)}`);
    
    // Extract content from the response format based on the structure we observed in logs
    let responseContent = '';
    
    // Check for the specific format seen in the logs
    if (data.output && Array.isArray(data.output)) {
      // Look for message type output with content
      for (const item of data.output) {
        if (item.type === 'message' && item.content && Array.isArray(item.content)) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' && contentItem.text) {
              responseContent = contentItem.text;
              break;
            }
          }
          if (responseContent) break;
        }
      }
    }
    
    // Fallback to other possible formats if the above didn't work
    if (!responseContent) {
      if (data.output_text) {
        responseContent = data.output_text;
      } else if (typeof data.output === 'string') {
        responseContent = data.output;
      }
    }
    
    if (!responseContent) {
      // Log the full response for debugging
      console.error("Unexpected OpenAI reasoning model response format:", JSON.stringify(data, null, 2));
      throw new Error("Could not extract content from OpenAI reasoning model response");
    }
    
    console.log(`Successfully extracted response content, length: ${responseContent.length}`);
    
    // Estimate token counts from usage info if available
    const inputTokens = data.usage?.input_tokens || Math.round((content.length + systemPrompt.length) / 4);
    const outputTokens = data.usage?.output_tokens || Math.round(responseContent.length / 4);
    
    return new Response(
      JSON.stringify({ 
        content: responseContent,
        model: modelId,
        provider: 'OpenAI',
        tokens: {
          input: inputTokens,
          output: outputTokens
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in OpenAI reasoning model API call:", error);
    throw error;
  }
}

// OpenAI (GPT) handler for standard models
export async function handleOpenAIStandard(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images: string[] = []) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for standard OpenAI model ${modelId} with content: ${content.substring(0, 50)}...`);
  console.log(`Has images: ${images.length > 0}, image count: ${images.length}`);
  
  // Prepare the messages for OpenAI
  const formattedMessages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add message history (excluding the last user message which will be handled separately)
  for (const msg of messageHistory.slice(0, -1)) {
    if (msg.images && msg.images.length > 0) {
      // For messages with images, we need to use the special content format
      const content = [
        { type: "text", text: msg.content }
      ];
      
      // Add image URLs as image objects
      for (const imageUrl of msg.images) {
        content.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      }
      
      formattedMessages.push({
        role: msg.role,
        content: content
      });
    } else {
      // For text-only messages, use the simple format
      formattedMessages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }
  
  // Handle the current message (which might have images)
  if (images.length > 0) {
    const contentArray = [
      { type: "text", text: content }
    ];
    
    // Add image URLs as image objects
    for (const imageUrl of images) {
      contentArray.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }
    
    formattedMessages.push({
      role: 'user',
      content: contentArray
    });
  } else {
    formattedMessages.push({
      role: 'user',
      content: content
    });
  }

  console.log(`Calling OpenAI API with ${formattedMessages.length} messages...`);
  console.log(`First message role: ${formattedMessages[0].role}`);
  console.log(`Last message role: ${formattedMessages[formattedMessages.length-1].role}`);
  
  if (images.length > 0) {
    console.log('Request contains images, using vision capability');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  
  console.log(`Successfully received response from OpenAI`);
  const data = await response.json();
  
  // Extract token counts
  const inputTokens = data.usage ? data.usage.prompt_tokens : 0;
  const outputTokens = data.usage ? data.usage.completion_tokens : 0;
  
  return new Response(
    JSON.stringify({ 
      content: data.choices[0].message.content,
      model: modelId,
      provider: 'OpenAI',
      tokens: {
        input: inputTokens,
        output: outputTokens
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// OpenAI (DALL-E) image generation handler
export async function handleOpenAIImageGeneration(prompt: string, modelId: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing image generation request with prompt: ${prompt.substring(0, 50)}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3", // Using DALL-E 3 model
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI DALL-E API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Successfully generated image with DALL-E");
    
    if (data.data && data.data.length > 0) {
      return new Response(
        JSON.stringify({
          imageUrl: data.data[0].url,
          revisedPrompt: data.data[0].revised_prompt,
          model: "dall-e-3",
          provider: 'OpenAI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected OpenAI DALL-E response format:", data);
      throw new Error("Unexpected response format from OpenAI DALL-E API");
    }
  } catch (error) {
    console.error("Error in OpenAI DALL-E API call:", error);
    throw error;
  }
}

// Check if model requires special handling
export function isOSeriesReasoningModel(modelId: string): boolean {
  return oSeriesReasoningModels.includes(modelId);
}
