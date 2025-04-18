
import { corsHeaders } from "../utils/cors.ts";

// Krutrim API handler for DeepSeek-R1
export async function handleKrutrim(messageHistory: any[], content: string, modelId: string, systemPrompt: string, images?: string[], preSearchResults: any[] = [], files: string[] = []) {
  const KRUTRIM_API_KEY = Deno.env.get('KRUTRIM_API_KEY');
  if (!KRUTRIM_API_KEY) {
    throw new Error("Krutrim API key not configured. Please add your Krutrim API key in the Supabase settings.");
  }
  
  console.log(`Processing request for Krutrim model ${modelId}`);
  
  // If files are present, augment the original content with file content
  let enhancedContent = content;
  if (files && files.length > 0) {
    // Add summarization hint to prompt better files handling
    enhancedContent = `${content}\n\nHere are the contents of the provided files:\n\n`;
    
    // Process files more efficiently
    for (let i = 0; i < files.length; i++) {
      try {
        const fileContent = String(files[i]);
        
        // Extract file name using regex to be more reliable
        const fileNameMatch = fileContent.match(/^File: (.+?)$/m);
        const fileName = fileNameMatch ? fileNameMatch[1] : `File ${i + 1}`;
        
        // Extract content more efficiently
        const contentMatch = fileContent.match(/^Content: ([\s\S]+)$/m);
        let extractedContent = '';
        
        if (contentMatch && contentMatch[1]) {
          // Get only first 10,000 chars for better performance
          extractedContent = contentMatch[1].substring(0, 10000);
          if (contentMatch[1].length > 10000) {
            extractedContent += "... (content truncated for efficiency)";
          }
        } else {
          extractedContent = fileContent;
        }
        
        enhancedContent += `--- ${fileName} ---\n${extractedContent}\n\n`;
      } catch (error) {
        console.error(`Error processing file ${i}:`, error);
      }
    }
    
    enhancedContent += `\nPlease analyze and respond to the above file content${content ? ' based on my request' : ''}.`;
  }
  
  // Format messages for Krutrim API with optimized system prompt
  const systemPromptWithContext = `${systemPrompt}\n\nRespond concisely and efficiently. Focus on addressing the user's query directly.`;
  
  const formattedMessages = [
    { role: 'system', content: systemPromptWithContext },
    ...messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: enhancedContent }
  ];
  
  try {
    // Set fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50-second timeout
    
    const response = await fetch('https://cloud.olakrutrim.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KRUTRIM_API_KEY}`
      },
      body: JSON.stringify({
        model: "DeepSeek-R1", // Hardcoded as per requirement
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 25000,
      })
    });
    
    clearTimeout(timeoutId);
    
    // Handle response status first
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Krutrim API error: ${response.status} - ${errorText}`);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(`Krutrim API error: ${response.status} - ${error.error?.message || error.error || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`Krutrim API error: ${response.status} - ${errorText}`);
      }
    }
    
    const responseText = await response.text();
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Failed to parse Krutrim response as JSON: ${responseText.substring(0, 200)}...`);
      throw new Error(`Invalid JSON response from Krutrim API`);
    }
    
    // Validate the expected response structure
    if (parsedResponse.choices && 
        Array.isArray(parsedResponse.choices) && 
        parsedResponse.choices.length > 0 && 
        parsedResponse.choices[0].message && 
        parsedResponse.choices[0].message.content) {
      
      return new Response(
        JSON.stringify({ 
          content: parsedResponse.choices[0].message.content,
          model: modelId,
          provider: 'Krutrim',
          tokens: {
            input: parsedResponse.usage?.prompt_tokens || Math.round((content.length + systemPrompt.length) / 4),
            output: parsedResponse.usage?.completion_tokens || 
              (parsedResponse.choices && parsedResponse.choices[0] && parsedResponse.choices[0].message) ?
              Math.round(parsedResponse.choices[0].message.content.length / 4) : 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Unexpected response format from Krutrim API`);
    }
  } catch (error) {
    console.error("Error in Krutrim API call:", error);
    throw error;
  }
}
