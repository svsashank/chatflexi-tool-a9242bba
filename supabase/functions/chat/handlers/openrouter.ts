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
    
    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: openRouterModelId,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: false
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
    
    const actualModelUsed = data.model || openRouterModelId;
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      return new Response(
        JSON.stringify({ 
          content: data.choices[0].message.content,
          model: modelId, // Return our internal model ID
          actualModel: actualModelUsed, // Return the actual model used by OpenRouter
          provider: 'openrouter',
          tokens: {
            input: inputTokens,
            output: outputTokens
          }
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
  const modelMap: Record<string, string> = {
    // OpenAI models
    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4.5-preview': 'openai/gpt-4.5-preview',
    
    // Claude models
    'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
    'claude-3-5-sonnet-20241022': 'anthropic/claude-3-5-sonnet',
    'claude-3-7-sonnet-20250219': 'anthropic/claude-3-7-sonnet',
    'claude-3-opus-20240229': 'anthropic/claude-3-opus',
    
    // Gemini models
    'gemini-1.5-pro': 'google/gemini-1.5-pro',
    'gemini-1.5-flash': 'google/gemini-1.5-flash',
    'gemini-1.0-pro': 'google/gemini-pro',
    
    // Others models
    'grok-2-latest': 'xai/grok-2',
    'grok-3': 'xai/grok-3',
    'deepseek-r1': 'deepseek/deepseek-llm-chat',

    // Default fallback
    'default': 'openai/gpt-4o-mini'
  };
  
  return modelMap[modelId] || modelMap['default'];
}

// Check if a model supports vision/image inputs
function supportsVision(modelId: string): boolean {
  const visionModels = [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview',
    'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219', 'claude-3-opus-20240229',
    'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro-vision'
  ];
  
  return visionModels.includes(modelId);
}
