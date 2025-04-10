
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";
import { OpenAIStream } from "../../utils/openai.ts";

const apiKey = Deno.env.get("OPENAI_API_KEY");

if (!apiKey) {
  console.warn("OPENAI_API_KEY not found in environment variables.");
}

const config = new Configuration({
  apiKey: apiKey,
});

const openai = new OpenAIApi(config);

// Function to count tokens using OpenAI's tiktoken library
async function countTokens(modelName: string, text: string): Promise<number> {
  try {
    const tiktoken = await import("tiktoken");
    const encoding = tiktoken.encoding_for_model(modelName);
    const tokens = encoding.encode(text);
    encoding.free(); // Free the encoder to avoid memory leaks
    return tokens.length;
  } catch (error) {
    console.error("Failed to count tokens:", error);
    // Fallback to a rough estimate if tiktoken fails
    return Math.ceil(text.length / 4);
  }
}

// Utility function to handle API errors
function handleAPIError(error: any): { status: number; message: string } {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error("OpenAI API Error Status:", error.response.status);
    console.error("OpenAI API Error Data:", error.response.data);
    return {
      status: error.response.status,
      message: `OpenAI API Error: ${error.response.status} - ${
        error.response.data?.error?.message || "No detailed message"
      }`,
    };
  } else if (error.request) {
    // The request was made but no response was received
    console.error("OpenAI API Request Error:", error.request);
    return {
      status: 500,
      message: "OpenAI API Request Error: No response received",
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error("OpenAI API Configuration Error:", error.message);
    return {
      status: 500,
      message: `OpenAI API Configuration Error: ${error.message}`,
    };
  }
}

// Standard OpenAI Chat Completion API
export async function handleOpenAIStandard(
  messageHistory: any[], 
  content: string, 
  modelId: string, 
  systemPrompt: string,
  images?: string[],
  webSearchResults?: any[],
  fileSearchResults?: any[]
) {
  console.log(`Using OpenAI Standard API with model: ${modelId}`);
  
  // Enhanced System Prompt
  let enhancedSystemPrompt = systemPrompt;
  
  // If there are web search results, add them to the system prompt
  if (webSearchResults && webSearchResults.length > 0) {
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
    
    enhancedSystemPrompt += "\n\n" + searchContext;
  }

  // If there are file search results, add them to the system prompt
  if (fileSearchResults && fileSearchResults.length > 0) {
    const fileContext = `
I've analyzed the following files the user has provided:
${fileSearchResults.map((file, index) => `
[${index + 1}] ${file.filename}
${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}
`).join('\n')}

Please analyze these files and respond to the user's query about them.`;
    
    enhancedSystemPrompt += "\n\n" + fileContext;
  }
  
  const messages = [
    { role: "system", content: enhancedSystemPrompt },
    ...messageHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: content },
  ];
  
  // Log the final messages array sent to OpenAI
  console.log("Final messages array sent to OpenAI:", JSON.stringify(messages, null, 2));
  
  try {
    const response = await openai.createChatCompletion(
      {
        model: modelId,
        messages: messages,
        stream: false, // Set to false to receive the full response at once
        max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (response.status !== 200) {
      const errorInfo = handleAPIError(response);
      throw new Error(errorInfo.message);
    }
    
    const message = response.data.choices[0].message?.content;
    const inputTokens = await countTokens(modelId, messages.map(m => m.content).join(""));
    const outputTokens = await countTokens(modelId, message || "");
    
    return new Response(
      JSON.stringify({
        content: message,
        model: modelId,
        provider: "OpenAI",
        tokens: { input: inputTokens, output: outputTokens },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    const errorInfo = handleAPIError(error);
    console.error("OpenAI API Error:", error);
    
    return new Response(
      JSON.stringify({
        content: `Error: ${errorInfo.message}`,
        model: modelId,
        provider: "OpenAI",
        tokens: { input: 0, output: 0 },
      }),
      {
        status: 200, // Return 200 OK to prevent the client from retrying.
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// OpenAI Chat Completion API with streaming
export async function handleOpenAIStream(
  messageHistory: any[],
  content: string,
  modelId: string,
  systemPrompt: string
) {
  console.log(`Using OpenAI Streaming API with model: ${modelId}`);
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...messageHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: content },
  ];
  
  try {
    const response = await openai.createChatCompletion(
      {
        model: modelId,
        messages: messages,
        stream: true,
        max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${apiKey}`, // Already managed by OpenAI instance
        },
      }
    );
    
    if (response.status !== 200) {
      const errorInfo = handleAPIError(response);
      throw new Error(errorInfo.message);
    }
    
    // console.log("OpenAIStream response headers:", response.headers);
    
    const stream = OpenAIStream(response);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    const errorInfo = handleAPIError(error);
    console.error("OpenAI API Error:", error);
    
    return new Response(
      JSON.stringify({
        content: `Error: ${errorInfo.message}`,
        model: modelId,
        provider: "OpenAI",
        tokens: { input: 0, output: 0 },
      }),
      {
        status: 200, // Return 200 OK to prevent the client from retrying.
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// O-Series Reasoning Models (special handling for tool use)
export async function handleOpenAIReasoningModel(
  messageHistory: any[], 
  content: string, 
  modelId: string, 
  systemPrompt: string,
  images?: string[],
  webSearchResults?: any[],
  fileSearchResults?: any[]
) {
  console.log(`Using OpenAI O-Series Reasoning API with model: ${modelId}`);
  
  let enhancedSystemPrompt = systemPrompt;
  
  // Add web search context if needed
  if (webSearchResults && webSearchResults.length > 0) {
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
    
    enhancedSystemPrompt += "\n\n" + searchContext;
  }
  
  // Add file context if needed
  if (fileSearchResults && fileSearchResults.length > 0) {
    const fileContext = `
I've analyzed the following files the user has provided:
${fileSearchResults.map((file, index) => `
[${index + 1}] ${file.filename}
${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}
`).join('\n')}

Please analyze these files and respond to the user's query about them.`;
    
    enhancedSystemPrompt += "\n\n" + fileContext;
  }
  
  const messages = [
    { role: "system", content: enhancedSystemPrompt },
    ...messageHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: content },
  ];
  
  // Log the final messages array sent to OpenAI
  console.log("Final messages array sent to OpenAI:", JSON.stringify(messages, null, 2));
  
  try {
    const response = await openai.createChatCompletion(
      {
        model: modelId,
        messages: messages,
        stream: false, // Set to false to receive the full response at once
        max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (response.status !== 200) {
      const errorInfo = handleAPIError(response);
      throw new Error(errorInfo.message);
    }
    
    const message = response.data.choices[0].message?.content;
    const inputTokens = await countTokens(modelId, messages.map(m => m.content).join(""));
    const outputTokens = await countTokens(modelId, message || "");
    
    return new Response(
      JSON.stringify({
        content: message,
        model: modelId,
        provider: "OpenAI",
        tokens: { input: inputTokens, output: outputTokens },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    const errorInfo = handleAPIError(error);
    console.error("OpenAI API Error:", error);
    
    return new Response(
      JSON.stringify({
        content: `Error: ${errorInfo.message}`,
        model: modelId,
        provider: "OpenAI",
        tokens: { input: 0, output: 0 },
      }),
      {
        status: 200, // Return 200 OK to prevent the client from retrying.
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// Helper function to determine if a model is an O-series reasoning model
export function isOSeriesReasoningModel(modelId: string): boolean {
  return modelId.startsWith("o");
}
