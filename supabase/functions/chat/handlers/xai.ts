
import { corsHeaders } from "../utils/cors.ts";

// Extract model ID based on input
function getGrokModelId(modelId: string): string {
  switch(modelId) {
    case 'grok-3':
      return "grok-3";
    case 'grok-3-mini':
      return "grok-3-mini";
    default:
      return "grok-2-latest";
  }
}

// Process and append file contents to the user input content for context
function processFiles(files: string[], content: string): string {
  if (!files || files.length === 0) {
    return content;
  }

  let enhancedContent = `${content}\n\nHere are the contents of the provided files:\n\n`;
  
  files.forEach((fileContent, index) => {
    try {
      const fileContentStr = String(fileContent);
      console.log(`Processing file ${index + 1}, content length: ${fileContentStr.length} chars`);
      
      const fileNameMatch = fileContentStr.match(/^File: (.+?)$/m);
      const fileName = fileNameMatch ? fileNameMatch[1] : `File ${index + 1}`;
      console.log(`Extracted file name: ${fileName}`);
      
      const contentMatch = fileContentStr.match(/^Content: ([\s\S]+)$/m);
      const extractedContent = contentMatch ? contentMatch[1] : fileContentStr;
      
      enhancedContent += `--- ${fileName} ---\n${extractedContent}\n\n`;
    } catch (error) {
      console.error(`Error processing file ${index}:`, error);
    }
  });
  
  enhancedContent += `\nPlease analyze and respond to the above file content${content ? ' based on my request' : ''}.`;
  console.log(`Enhanced content with ${files.length} file(s). New content length: ${enhancedContent.length} chars`);
  
  return enhancedContent;
}

// Format the full message history with a system prompt and the user's content
function formatMessages(messageHistory: any[], content: string, systemPrompt: string): any[] {
  return [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content }
  ];
}

// Estimate token counts from string lengths as rough guess
function estimateTokens(content: string, systemPrompt: string, responseContent: string) {
  return {
    input: Math.round((content.length + systemPrompt.length) / 4),
    output: Math.round(responseContent.length / 4)
  };
}

// Parse and validate the xAI API response text
async function parseXAIResponse(response: Response) {
  const responseText = await response.text();
  console.log(`xAI API response status: ${response.status}`);
  console.log(`xAI API response first 500 chars: ${responseText.substring(0, 500)}...`);
  console.log(`Full response length: ${responseText.length} chars`);
  
  try {
    const parsedResponse = JSON.parse(responseText);
    console.log(`Successfully received response from xAI`);
    console.log(`xAI response structure: ${JSON.stringify(Object.keys(parsedResponse))}`);
    return parsedResponse;
  } catch (parseError) {
    console.error(`Failed to parse xAI response as JSON: ${responseText}`);
    throw new Error(`Invalid JSON response from xAI API: ${responseText.substring(0, 100)}...`);
  }
}

// Call the xAI API with the prepared data and return a Response with formatted result
async function callXAIAPI(formattedMessages: any[], modelId: string) {
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  if (!XAI_API_KEY) {
    throw new Error("xAI API key not configured. Please add your xAI API key in the Supabase settings.");
  }

  console.log(`Calling xAI API with model ${modelId}...`);

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 4000,
      stream: false
    })
  });

  return response;
}

export async function handleXAI(
  messageHistory: any[],
  content: string,
  modelId: string,
  systemPrompt: string,
  images: string[] = [],
  preSearchResults: any[] = [],
  files: string[] = []
) {
  const grokModelId = getGrokModelId(modelId);
  console.log(`Processing request for xAI model ${grokModelId} with content: ${content.substring(0, 50)}...`);
  console.log(`Has files: ${files.length > 0}, file count: ${files.length}`);

  const enhancedContent = processFiles(files, content);
  const formattedMessages = formatMessages(messageHistory, enhancedContent, systemPrompt);

  try {
    const response = await callXAIAPI(formattedMessages, grokModelId);
    const parsedResponse = await parseXAIResponse(response);

    if (
      parsedResponse.choices && 
      Array.isArray(parsedResponse.choices) && 
      parsedResponse.choices.length > 0 && 
      parsedResponse.choices[0].message && 
      parsedResponse.choices[0].message.content
    ) {
      const fullContent = parsedResponse.choices[0].message.content;
      console.log(`Full response content length: ${fullContent.length} chars`);

      const tokens = estimateTokens(content, systemPrompt, fullContent);

      return new Response(
        JSON.stringify({ 
          content: fullContent,
          model: grokModelId,
          provider: 'xAI',
          tokens: {
            input: parsedResponse.usage?.prompt_tokens || tokens.input,
            output: parsedResponse.usage?.completion_tokens || tokens.output
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected xAI response format:", parsedResponse);
      throw new Error(`Unexpected response format from xAI API. The API returned a successful status but the response doesn't match the expected structure.`);
    }
  } catch (error) {
    console.error("Error in xAI API call:", error);
    throw error;
  }
}
