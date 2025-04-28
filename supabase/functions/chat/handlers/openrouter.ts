import { corsHeaders } from "../utils/cors.ts";

// OpenRouter integration handler
export async function handleOpenRouter(
  messageHistory: any[],
  content: string,
  modelId: string,
  systemPrompt: string,
  images: string[] = [],
  preSearchResults: any[] = [],
  files: string[] = []
) {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured. Please add your OpenRouter API key in the Supabase settings.");
  }
  
  // Map our internal model ID to OpenRouter model ID
  const openRouterModelId = mapModelIdToOpenRouter(modelId);
  console.log(`Processing request via OpenRouter for model ${modelId} (mapped to ${openRouterModelId})`);
  
  // Enhanced processing for files
  let enhancedContent = content;
  if (files && files.length > 0) {
    enhancedContent = `${content}\n\nHere are the contents of the provided files:\n\n`;
    
    files.forEach((fileContent, index) => {
      try {
        const fileContentStr = String(fileContent);
        
        const fileNameMatch = fileContentStr.match(/^File: (.+?)$/m);
        const fileName = fileNameMatch ? fileNameMatch[1] : `File ${index + 1}`;
        
        const contentMatch = fileContentStr.match(/^Content: ([\s\S]+)$/m);
        const extractedContent = contentMatch ? contentMatch[1] : fileContentStr;
        
        enhancedContent += `--- ${fileName} ---\n${extractedContent}\n\n`;
      } catch (error) {
        console.error(`Error processing file ${index}:`, error);
      }
    });
    
    enhancedContent += `\nPlease analyze and respond to the above file content${content ? ' based on my request' : ''}.`;
  }
  
  // Add web search results if available
  if (preSearchResults && preSearchResults.length > 0) {
    enhancedContent += `\n\nWeb search results related to the query:\n`;
    preSearchResults.forEach((result, index) => {
      enhancedContent += `\n[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}\n`;
    });
    enhancedContent += `\nPlease use these search results to inform your response if relevant.`;
  }
  
  // Format messages for OpenRouter API
  let messages = [
    { role: "system", content: systemPrompt }
  ];
  
  // Add message history
  if (messageHistory.length > 0) {
    messages = [
      ...messages,
      ...messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];
  }
  
  // Add current message with images if present
  let userMessage: any = {
    role: "user",
    content: enhancedContent
  };
  
  // Add image handling if needed and supported by the model
  if (images && images.length > 0 && supportsVision(modelId)) {
    userMessage = {
      role: "user",
      content: [
        { type: "text", text: enhancedContent }
      ]
    };
    
    // Add each image as content
    images.forEach(image => {
      try {
        if (image.startsWith('data:image/')) {
          // Extract the mime type and base64 data
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            
            userMessage.content.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            });
            
            console.log(`Added base64 image with mime type: ${mimeType}`);
          }
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    });
  }
  
  // Add the user message to the messages array
  messages.push(userMessage);
  
  try {
    console.log(`Sending request to OpenRouter for model: ${openRouterModelId}`);
    
    // Add appropriate headers
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://krix.app", // Please update this with your actual domain
      "X-Title": "Krix AI Assistant" // Update with your app name
    };
    
    // Check if this is an O-series model that needs reasoning
    const isOSeries = modelId.startsWith('o') || modelId.includes('/o');
    
    // Determine if we should use the thinking format for special models
    const useThinkingFormat = modelId.includes('thinking');
    const extraParams = useThinkingFormat ? { system_format: 'zephyr_thinking' } : {};
    
    // Add reasoning parameter for O-series models
    if (isOSeries) {
      console.log(`Adding reasoning parameter for O-series model: ${modelId}`);
      extraParams['reasoning'] = { 
        effort: "high",  // Default to high effort
        exclude: false   // Include reasoning in response by default
      };
    }
    
    // Calculate appropriate max tokens based on model type
    const maxTokens = determineMaxTokensForModel(modelId);
    
    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: openRouterModelId,
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: false,
        ...extraParams
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully received response from OpenRouter`);
    
    // Extract token counts and model ID
    const inputTokens = data.usage?.prompt_tokens || Math.round(content.length / 4);
    const outputTokens = data.usage?.completion_tokens || 
      (data.choices && data.choices[0] && data.choices[0].message) ? 
      Math.round(data.choices[0].message.content.length / 4) : 0;
    
    // Extract reasoning tokens and content if present
    let reasoningTokens = 0;
    let reasoningContent = null;
    
    if (isOSeries && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.reasoning) {
      reasoningContent = data.choices[0].message.reasoning;
      reasoningTokens = Math.round(reasoningContent.length / 4); // Estimate reasoning tokens
      console.log(`Extracted reasoning content (${reasoningTokens} tokens) from O-series model response`);
    }
    
    const actualModelUsed = data.model || openRouterModelId;
    
    console.log(`Token counts - Input: ${inputTokens}, Output: ${outputTokens}, Reasoning: ${reasoningTokens}`);
    console.log(`Actual model used: ${actualModelUsed}`);
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      return new Response(
        JSON.stringify({ 
          content: data.choices[0].message.content,
          model: modelId, // Return our internal model ID
          actualModel: actualModelUsed, // Return the actual model used by OpenRouter
          provider: 'openrouter',
          tokens: {
            input: inputTokens,
            output: outputTokens,
            reasoning: reasoningTokens > 0 ? reasoningTokens : undefined
          },
          reasoningContent: reasoningContent
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected OpenRouter response format:", data);
      throw new Error("Unexpected response format from OpenRouter API");
    }
  } catch (error) {
    console.error("Error in OpenRouter API call:", error);
    throw error;
  }
}

// Map our internal model IDs to OpenRouter model IDs
function mapModelIdToOpenRouter(modelId: string): string {
  // OpenAI Models
  const openaiModels: Record<string, string> = {
    'openai/o4-mini-high': 'openai/o4-mini-high',
    'openai/o3': 'openai/o3',
    'openai/o4-mini': 'openai/o4-mini',
    'openai/gpt-4.1': 'openai/gpt-4.1',
    'openai/gpt-4.1-mini': 'openai/gpt-4.1-mini',
    'openai/gpt-4.1-nano': 'openai/gpt-4.1-nano',
    'openai/o1-pro': 'openai/o1-pro',
    'openai/o1': 'openai/o1',
    'openai/o1-preview': 'openai/o1-preview',
    'openai/o1-mini-2024-09-12': 'openai/o1-mini-2024-09-12',
    'openai/chatgpt-4o-latest': 'openai/chatgpt-4o-latest',
    'openai/o3-mini-high': 'openai/o3-mini-high',
    'openai/o3-mini': 'openai/o3-mini',
    'openai/gpt-4o-2024-11-20': 'openai/gpt-4o-2024-11-20',
    'openai/gpt-4o-2024-08-06': 'openai/gpt-4o-2024-08-06',
    'openai/gpt-4o-2024-05-13': 'openai/gpt-4o-2024-05-13',
    'openai/gpt-4o': 'openai/gpt-4o',
    'openai/gpt-4o-mini': 'openai/gpt-4o-mini',
    
    // Legacy OpenAI models (for backward compatibility)
    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
    'gpt-4': 'openai/gpt-4-turbo',
    'gpt-4.5-preview': 'openai/gpt-4.1',
    'o1': 'openai/o1',
    'o1-mini': 'openai/o1-mini-2024-09-12',
    'o1-pro': 'openai/o1-pro',
    'o3-mini': 'openai/o3-mini',
    'o3': 'openai/o3',
    'o4-mini-high': 'openai/o4-mini-high',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
  };
  
  // Anthropic Models
  const anthropicModels: Record<string, string> = {
    'anthropic/claude-3-opus': 'anthropic/claude-3-opus',
    'anthropic/claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3.7-sonnet:thinking': 'anthropic/claude-3.7-sonnet:thinking',
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
    'anthropic/claude-3-haiku': 'anthropic/claude-3-haiku',
    
    // Legacy Claude models (for backward compatibility)
    'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
    'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet',
    'claude-3-7-sonnet-20250219': 'anthropic/claude-3.7-sonnet',
    'claude-3-opus-20240229': 'anthropic/claude-3-opus',
  };
  
  // Google/Gemini Models
  const googleModels: Record<string, string> = {
    'google/gemini-2.5-pro-preview-03-25': 'google/gemini-2.5-pro-preview-03-25',
    'google/gemini-2.0-flash-lite-001': 'google/gemini-2.0-flash-lite-001',
    'google/gemini-2.0-flash-001': 'google/gemini-2.0-flash-001',
    'google/gemini-flash-1.5-8b': 'google/gemini-flash-1.5-8b',
    'google/gemini-flash-1.5': 'google/gemini-flash-1.5',
    'google/gemini-pro-1.5': 'google/gemini-pro-1.5',
    
    // Legacy Google/Gemini models (for backward compatibility)
    'gemini-1.0-pro': 'google/gemini-pro-1.5',
    'gemini-pro-vision': 'google/gemini-pro-1.5',
    'gemini-ultra': 'google/gemini-pro-1.5',
    'gemini-1.5-flash': 'google/gemini-flash-1.5',
    'gemini-1.5-pro': 'google/gemini-pro-1.5',
    'gemini-1.5-flash-8k': 'google/gemini-flash-1.5-8b',
  };
  
  // xAI/Grok Models
  const xaiModels: Record<string, string> = {
    'x-ai/grok-3-beta': 'x-ai/grok-3-beta',
    'x-ai/grok-3-mini-beta': 'x-ai/grok-3-mini-beta',
    'x-ai/grok-2-vision-1212': 'x-ai/grok-2-vision-1212',
    'x-ai/grok-2-1212': 'x-ai/grok-2-1212',
    
    // Legacy xAI/Grok models (for backward compatibility)
    'grok-2-latest': 'x-ai/grok-2-1212',
    'grok-3': 'x-ai/grok-3-beta',
    'grok-3-mini': 'x-ai/grok-3-mini-beta',
  };
  
  // DeepSeek Models
  const deepseekModels: Record<string, string> = {
    'deepseek/deepseek-chat-v3-0324': 'deepseek/deepseek-chat-v3-0324',
    'deepseek/deepseek-r1': 'deepseek/deepseek-r1',
    
    // Legacy DeepSeek models
    'deepseek-r1': 'deepseek/deepseek-r1',
    'deepseek-r1-llama-70b': 'deepseek/deepseek-r1',
    'deepseek-r1-llama-8b': 'deepseek/deepseek-r1',
    'deepseek-r1-qwen-14b': 'deepseek/deepseek-r1',
  };
  
  // Combine all model maps
  const allModels = {
    ...openaiModels,
    ...anthropicModels,
    ...googleModels,
    ...xaiModels,
    ...deepseekModels,
  };
  
  // Find the model ID in our combined map
  const mappedId = allModels[modelId];
  
  // Return the mapped ID if found, otherwise use a default model
  if (mappedId) {
    return mappedId;
  }
  
  // Fallback by provider if possible
  if (modelId.includes('gpt') || modelId.includes('openai') || modelId.includes('o1') || 
      modelId.includes('o3') || modelId.includes('o4')) {
    console.warn(`Model ${modelId} not found in OpenAI mappings, falling back to gpt-4o-mini`);
    return 'openai/gpt-4o-mini';
  }
  
  if (modelId.includes('claude') || modelId.includes('anthropic')) {
    console.warn(`Model ${modelId} not found in Anthropic mappings, falling back to claude-3-haiku`);
    return 'anthropic/claude-3-haiku';
  }
  
  if (modelId.includes('gemini') || modelId.includes('google')) {
    console.warn(`Model ${modelId} not found in Google mappings, falling back to gemini-flash-1.5`);
    return 'google/gemini-flash-1.5';
  }
  
  if (modelId.includes('grok') || modelId.includes('xai') || modelId.includes('x-ai')) {
    console.warn(`Model ${modelId} not found in xAI mappings, falling back to grok-2-1212`);
    return 'x-ai/grok-2-1212';
  }
  
  if (modelId.includes('deepseek')) {
    console.warn(`Model ${modelId} not found in DeepSeek mappings, falling back to deepseek-chat`);
    return 'deepseek/deepseek-chat-v3-0324';
  }
  
  // Ultimate fallback to a reliable model
  console.warn(`Unknown model ${modelId}, falling back to openai/gpt-4o-mini`);
  return 'openai/gpt-4o-mini';
}

// Check if a model supports vision/image inputs
function supportsVision(modelId: string): boolean {
  const visionModels = [
    // OpenAI Models with vision
    'openai/o4-mini-high', 'openai/o3', 'openai/o4-mini', 'openai/gpt-4.1', 'openai/gpt-4.1-mini',
    'openai/gpt-4o-2024-11-20', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/chatgpt-4o-latest',
    
    // Other model providers with vision support
    'google/gemini-2.5-pro-preview-03-25', 'google/gemini-pro-1.5', 'google/gemini-flash-1.5',
    'x-ai/grok-2-vision-1212',
    
    // Legacy models with vision
    'gpt-4', 'gemini-pro-vision', 'claude-3-5-sonnet-20241022',
    'claude-3-7-sonnet-20250219', 'claude-3-opus-20240229', 'gemini-ultra',
    'o1', 'o3', 'o4-mini-high',
  ];
  
  return visionModels.includes(modelId);
}

// Determine the appropriate max_tokens value based on the model's capabilities
function determineMaxTokensForModel(modelId: string): number {
  // Check if this is an O-series model that uses reasoning
  if (modelId.startsWith('o') || modelId.includes('/o')) {
    // O-series models need more tokens for reasoning
    return 4096; // Higher limit for O-series with reasoning
  }
  
  // Models with large output capacity
  if (modelId.includes('claude-3-opus') || 
      modelId.includes('claude-3.7') ||
      modelId.includes('gpt-4.1') ||
      modelId.includes('gemini-2.5') ||
      modelId.includes('gemini-pro-1.5') ||
      modelId.includes('o1-pro')) {
    return 4096; // Larger output for premium models
  }
  
  // Models with medium output capacity
  if (modelId.includes('gpt-4o') || 
      modelId.includes('claude-3.5') ||
      modelId.includes('deepseek') ||
      modelId.includes('o3') ||
      modelId.includes('o4')) {
    return 2048; // Medium output for standard models
  }
  
  // Models optimized for efficiency
  if (modelId.includes('claude-3-haiku') ||
      modelId.includes('gpt-4o-mini') ||
      modelId.includes('gemini-flash-1.5') ||
      modelId.includes('grok') ||
      modelId.includes('o1-mini')) {
    return 1024; // Smaller output for efficiency
  }
  
  // Default for other models
  return 1500; // Safe default for unrecognized models
}
