import { corsHeaders } from "../utils/cors.ts";
import { performBraveSearch } from "../utils/braveSearch.ts";

// O-series reasoning models from OpenAI that require special handling
const oSeriesReasoningModels = [
  'o1',
  'o1-mini',
  'o3-mini',
  'o1-pro',
];

// OpenAI O-series Reasoning Models handler (o1, o1-mini, o3-mini, o1-pro)
export async function handleOpenAIReasoningModel(
  messageHistory: any[], 
  content: string, 
  modelId: string, 
  systemPrompt: string, 
  images: string[] = [],
  preSearchResults: any[] = [],
  files: string[] = []
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for OpenAI reasoning model ${modelId} with content: ${content.substring(0, 50)}...`);
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
  
  // Use pre-search results if available, otherwise perform search
  let webSearchResults = preSearchResults.length > 0 ? preSearchResults : [];
  
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
  
  // Add the current user message with enhanced content
  formattedInput.push({ role: 'user', content: enhancedContent });

  console.log(`Calling OpenAI responses API for reasoning model ${modelId}...`);
  
  // Define tools properly as objects
  const tools = [
    {
      type: "web_search"
    },
    {
      type: "file_search"
    }
  ];
  
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
        reasoning: { effort: "high" }, // Using high effort for best results
        tools: tools
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`OpenAI responses API error (${response.status}):`, error);
      throw new Error(error.error?.message || `OpenAI responses API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Full response structure from OpenAI reasoning model:`, JSON.stringify(data, null, 2));
    
    // Extract content from the response format
    let responseContent = '';
    let fileSearchResults = [];
    
    // Parse the output based on the structure returned by the API
    if (data.output && Array.isArray(data.output)) {
      // Extract message content
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
      
      // Extract web search queries if we haven't done a proactive search
      if (!webSearchResults.length) {
        for (const item of data.output) {
          if (item.type === 'tool_result' && item.tool === 'web_search') {
            // Get search queries
            let searchQuery = content;
            if (item.input && item.input.query) {
              searchQuery = item.input.query;
            }
            console.log(`Performing web search for API-requested query: "${searchQuery}"`);
            
            // Use Brave Search API to get real results
            webSearchResults = await performBraveSearch(searchQuery);
            console.log("Got web search results from Brave:", JSON.stringify(webSearchResults, null, 2));
            
            // If we got search results but haven't generated a response yet, make a follow-up call
            if (webSearchResults.length > 0 && !responseContent) {
              // Generate a new system prompt with search results that emphasizes they're supplemental
              const searchContext = `
I've found some potentially relevant information from the web about the user's query.
This is supplementary context to help inform your response, but you should not be limited to only this information.
Use your own knowledge and capabilities alongside this information to provide the best possible answer.

Here are some relevant web search results:
${webSearchResults.map((result, index) => `
[${index + 1}] ${result.title}
URL: ${result.url}
${result.snippet}
`).join('\n')}

Feel free to reference this information if it's helpful, but also draw on your broader knowledge to provide a comprehensive response to the user's question.`;
              
              const enhancedSystemPrompt = systemPrompt + "\n" + searchContext;
              
              // Make a follow-up call with search results
              const followUpInput = [
                { role: 'system', content: enhancedSystemPrompt },
                ...historyWithoutLastUserMessage.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                { role: 'user', content }
              ];
              
              const followUpResponse = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'OpenAI-Beta': 'responses=v1'
                },
                body: JSON.stringify({
                  model: modelId,
                  input: followUpInput,
                  reasoning: { effort: "high" },
                })
              });
              
              if (followUpResponse.ok) {
                const followUpData = await followUpResponse.json();
                console.log("Follow-up response with search results:", JSON.stringify(followUpData, null, 2));
                
                // Extract content from follow-up response
                if (followUpData.output && Array.isArray(followUpData.output)) {
                  for (const item of followUpData.output) {
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
              }
            }
          }
        }
      }
      
      // Extract file search results
      for (const item of data.output) {
        if (item.type === 'tool_result' && item.tool === 'file_search' && item.result) {
          fileSearchResults = Array.isArray(item.result) ? item.result : [];
          console.log("Found file search results:", JSON.stringify(fileSearchResults));
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
      console.error("Unexpected OpenAI reasoning model response format:", JSON.stringify(data, null, 2));
      responseContent = "I'm processing your request. Please wait while I analyze the information.";
    }
    
    // If we have search results but no response content, create a temporary message
    if (webSearchResults.length > 0 && !responseContent) {
      responseContent = "I've found some information that might help answer your question. Let me analyze these search results for you.";
    }
    
    // Estimate token counts from usage info if available
    const inputTokens = data.usage?.input_tokens || Math.round((enhancedContent.length + systemPrompt.length) / 4);
    const outputTokens = data.usage?.output_tokens || Math.round(responseContent.length / 4);
    
    return new Response(
      JSON.stringify({ 
        content: responseContent,
        model: modelId,
        provider: 'OpenAI',
        tokens: {
          input: inputTokens,
          output: outputTokens
        },
        webSearchResults: webSearchResults,
        fileSearchResults: fileSearchResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in OpenAI reasoning model API call:", error);
    throw error;
  }
}

// OpenAI (GPT) handler for standard models
export async function handleOpenAIStandard(
  messageHistory: any[], 
  content: string, 
  modelId: string, 
  systemPrompt: string, 
  images: string[] = [],
  preSearchResults: any[] = [],
  files: string[] = []
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing request for standard OpenAI model ${modelId} with content: ${content.substring(0, 50)}...`);
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
  
  // Use pre-search results if available
  let webSearchResults = preSearchResults.length > 0 ? preSearchResults : [];
  console.log(`Has pre-search results: ${webSearchResults.length > 0}, result count: ${webSearchResults.length}`);
  
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
      { type: "text", text: enhancedContent }
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
      content: enhancedContent
    });
  }

  console.log(`Calling OpenAI API with ${formattedMessages.length} messages...`);
  
  // Define tools for web search capability
  const tools = [
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for information",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "file_search",
        description: "Search through uploaded files",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string", 
              description: "The search query"
            }
          },
          required: ["query"]
        }
      }
    }
  ];
  
  try {
    // Response variables
    let responseContent = '';
    let fileSearchResults = [];
    let inputTokens = 0;
    let outputTokens = 0;
    
    // Make API call to OpenAI
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
        tools: tools,
        tool_choice: "auto" // Always allow the model to use tools
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }
    
    console.log(`Successfully received response from OpenAI`);
    const data = await response.json();
    
    // Extract token counts
    inputTokens = data.usage ? data.usage.prompt_tokens : 0;
    outputTokens = data.usage ? data.usage.completion_tokens : 0;
    
    // Extract content and tool calls
    responseContent = data.choices[0].message.content || '';
    const toolCalls = data.choices[0].message.tool_calls || [];
    
    // Handle tool calls
    if (toolCalls.length > 0) {
      console.log(`Tool calls detected: ${toolCalls.length}`);
      
      for (const toolCall of toolCalls) {
        console.log(`Tool call: ${JSON.stringify(toolCall)}`);
        
        try {
          // Process web search tool call if we haven't done a proactive search
          if (toolCall.function.name === "web_search" && webSearchResults.length === 0) {
            const args = JSON.parse(toolCall.function.arguments);
            const searchQuery = args.query || content;
            console.log(`Performing web search for tool-requested query: ${searchQuery}`);
            
            if (!searchQuery) continue;
            
            // Perform real search with Brave API
            webSearchResults = await performBraveSearch(searchQuery);
            console.log(`Received ${webSearchResults.length} search results from Brave`);
          }
          
          // Process file search tool call
          if (toolCall.function.name === "file_search") {
            const args = JSON.parse(toolCall.function.arguments);
            const searchQuery = args.query || '';
            
            if (!searchQuery) continue;
            
            // For now, we return empty file search results
            console.log(`Would perform file search for: ${searchQuery}`);
            fileSearchResults = [];
          }
        } catch (e) {
          console.error("Error processing tool call:", e);
        }
      }
    }
    
    // If we have search results, make a follow-up call to OpenAI with them
    if (webSearchResults.length > 0) {
      console.log("Making follow-up call with search results");
      
      // Create a new message with search results, emphasizing they're supplemental
      const searchResultsText = `I've found some potentially relevant information about your query. This is supplementary context to help inform my response:\n\n${
        webSearchResults.map((result, index) => 
          `[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`
        ).join('\n\n')
      }`;
      
      const followUpMessages = [...formattedMessages];
      followUpMessages.push({
        role: 'assistant',
        content: responseContent || "I need to search the web for more information about this."
      });
      
      followUpMessages.push({
        role: 'function',
        name: 'web_search',
        content: searchResultsText
      });
      
      followUpMessages.push({
        role: 'user',
        content: "Please answer my question based on both your knowledge and these search results, drawing on your own capabilities and the supplementary information provided."
      });
      
      // Make the follow-up API call
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        // Update the response content with the informed response
        responseContent = followUpData.choices[0].message.content || responseContent;
        
        // Add to the token counts
        if (followUpData.usage) {
          inputTokens += followUpData.usage.prompt_tokens;
          outputTokens += followUpData.usage.completion_tokens;
        }
        console.log("Updated response with informed content from search results");
      }
    }
    
    // If we still have no response content, create a temporary message
    if (!responseContent) {
      responseContent = "I've found some information that might help answer your question. Let me analyze these search results for you.";
    }
    
    return new Response(
      JSON.stringify({ 
        content: responseContent,
        model: modelId,
        provider: 'OpenAI',
        tokens: {
          input: inputTokens,
          output: outputTokens
        },
        webSearchResults: webSearchResults,
        fileSearchResults: fileSearchResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in OpenAI standard API call:", error);
    throw error;
  }
}

// Check if model requires special handling
export function isOSeriesReasoningModel(modelId: string): boolean {
  return oSeriesReasoningModels.includes(modelId);
}

// Check if query likely needs web search
function needsWebSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Check for factual questions that would benefit from search
  if (
    lowerQuery.includes('what is') ||
    lowerQuery.includes('who is') || 
    lowerQuery.includes('when was') ||
    lowerQuery.includes('where is') ||
    lowerQuery.includes('how to') ||
    lowerQuery.includes('why does') ||
    lowerQuery.includes('tell me about') ||
    lowerQuery.includes('find information') ||
    lowerQuery.includes('search for') ||
    lowerQuery.includes('have you heard') ||
    lowerQuery.includes('latest') ||
    lowerQuery.includes('recent') ||
    lowerQuery.includes('news about') ||
    lowerQuery.includes('current')
  ) {
    return true;
  }
  
  // Check for specific entities that might need web search
  const potentialEntities = query.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g);
  if (potentialEntities && potentialEntities.length > 0) {
    return true;
  }
  
  // If the query is longer than 10 words, it might be a complex question needing search
  const wordCount = query.split(/\s+/).length;
  if (wordCount > 10) {
    return true;
  }
  
  return false;
}
