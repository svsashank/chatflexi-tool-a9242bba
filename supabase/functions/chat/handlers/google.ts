import { corsHeaders } from "../utils/cors.ts";

// Google (Gemini) handler
export async function handleGoogle(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images: string[] = [], preSearchResults: any[] = [], files: string[] = []) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }
  
  console.log(`Processing request for Google model ${modelId} with content: ${content.substring(0, 50)}...`);
  console.log(`Has images: ${images.length > 0}, image count: ${images.length}`);
  console.log(`Has files: ${files.length > 0}, file count: ${files.length}`);
  
  // If files are present, augment the original content with file content
  let enhancedContent = content;
  if (files && files.length > 0) {
    // Extract files content and add it to the prompt
    enhancedContent = `${content}\n\nHere are the contents of the provided files:\n\n`;
    files.forEach((fileContent, index) => {
      try {
        // Parse the file content
        const fileContentStr = String(fileContent);
        console.log(`Processing file ${index + 1}, content length: ${fileContentStr.length} chars`);
        
        const fileNameMatch = fileContentStr.match(/^File: (.+?)$/m);
        const fileName = fileNameMatch ? fileNameMatch[1] : `File ${index + 1}`;
        console.log(`Extracted file name: ${fileName}`);
        
        // Extract the actual content part
        const contentMatch = fileContentStr.match(/^Content: ([\s\S]+)$/m);
        const extractedContent = contentMatch ? contentMatch[1] : fileContentStr;
        
        enhancedContent += `--- ${fileName} ---\n${extractedContent}\n\n`;
      } catch (error) {
        console.error(`Error processing file ${index}:`, error);
      }
    });
    
    enhancedContent += `\nPlease analyze and respond to the above file content${content ? ' based on my request' : ''}.`;
    console.log(`Enhanced content with ${files.length} file(s). New content length: ${enhancedContent.length} chars`);
  }
  
  // Format messages for Gemini, including system prompt
  const formattedContents = [];
  
  // Add system prompt as a first user message
  formattedContents.push({
    role: 'user',
    parts: [{ text: `System: ${systemPrompt}` }]
  });
  
  // Add message history (excluding the last user message which will be handled separately)
  for (const msg of messageHistory.slice(0, -1)) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      if (msg.images && msg.images.length > 0 && msg.role === 'user') {
        const parts = [{ text: msg.content }];
        
        // Add each image
        for (const imageUrl of msg.images) {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg", // Assume JPEG for simplicity
              data: imageUrl.replace(/^data:image\/[^;]+;base64,/, "") // Strip the data URL prefix if present
            }
          });
        }
        
        formattedContents.push({
          role: msg.role,
          parts: parts
        });
      } else {
        formattedContents.push({
          role: msg.role,
          parts: [{ text: msg.content }]
        });
      }
    }
  }
  
  // Handle current message with images if present
  if (images.length > 0) {
    const parts = [{ text: enhancedContent }]; // Use enhanced content with file data
    
    // Add each image
    for (const imageUrl of images) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg", // Assume JPEG for simplicity
          data: imageUrl.replace(/^data:image\/[^;]+;base64,/, "") // Strip the data URL prefix if present
        }
      });
    }
    
    formattedContents.push({
      role: 'user',
      parts: parts
    });
  } else {
    formattedContents.push({
      role: 'user',
      parts: [{ text: enhancedContent }] // Use enhanced content with file data
    });
  }

  // Map model IDs to the correct API versions and models according to the Gemini API
  // Based on latest documentation at https://ai.google.dev/gemini-api/docs
  let apiVersion = 'v1';
  let actualModelId = modelId;

  // Handle model mapping
  if (modelId === 'gemini-pro-vision') {
    actualModelId = 'gemini-1.0-pro-vision';
  } else if (modelId === 'gemini-1.0-pro') {
    actualModelId = 'gemini-1.0-pro';
  } else if (modelId.startsWith('gemini-1.5')) {
    // All Gemini 1.5 models remain the same
    actualModelId = modelId;
  } else if (modelId === 'gemini-ultra') {
    actualModelId = 'gemini-1.0-ultra';
  } else if (modelId === 'gemini-2.5-pro-preview-03-25') {
    actualModelId = 'gemini-2.5-pro-preview'; // Map to the actual API model name
  }
  
  const apiEndpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${actualModelId}:generateContent`;

  console.log(`Calling Google API with endpoint: ${apiEndpoint} (mapped from ${modelId} to ${actualModelId})...`);
  try {
    const requestBody = {
      contents: formattedContents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    };
    
    console.log(`Request payload structure: ${JSON.stringify(requestBody, null, 2).substring(0, 500)}...`);
    
    const response = await fetch(`${apiEndpoint}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error: ${response.status}`, errorText);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Google API error: ${response.status}`);
      } catch (e) {
        throw new Error(`Google API error: ${response.status} - ${errorText}`);
      }
    }
    
    console.log(`Successfully received response from Google`);
    const data = await response.json();
    
    // Handle the response properly
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error('Invalid response structure from Google API:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response structure from Google API');
    }
    
    // Extract the content text
    const responseText = data.candidates[0].content.parts?.[0]?.text;
    if (!responseText) {
      console.error('No text content found in response:', JSON.stringify(data, null, 2));
      throw new Error('No text content found in response');
    }
    
    // Estimate token counts (Google doesn't always provide this)
    const inputTokensEstimate = Math.round((content.length + systemPrompt.length) / 4);
    const outputTokensEstimate = Math.round(responseText.length / 4);
    
    return new Response(
      JSON.stringify({ 
        content: responseText,
        model: modelId,
        provider: 'Google',
        tokens: {
          input: data.usageMetadata?.promptTokenCount || inputTokensEstimate,
          output: data.usageMetadata?.candidatesTokenCount || outputTokensEstimate
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Google API call:", error);
    throw error;
  }
}
