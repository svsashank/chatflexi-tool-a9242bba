
import { corsHeaders } from "../../chat/utils/cors.ts";

export async function handleOpenAIImageGeneration(
  prompt: string, 
  modelId: string = "dall-e-3", 
  enhancePrompt: boolean = false,
  referenceImageUrl?: string
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  console.log(`Processing image generation with OpenAI model ${modelId}`);
  console.log(`Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
  
  try {
    // Always use DALL-E 3 for image generation regardless of the chat model used
    const actualModelId = "dall-e-3";
    
    let requestBody: any = {
      model: actualModelId,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url"
    };
    
    // If reference image is provided, we need to use the variations API
    if (referenceImageUrl) {
      console.log("Using image variations API with reference image");
      
      // For variations, we need to fetch the image first
      const imageResponse = await fetch(referenceImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch reference image: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append("image", imageBlob);
      formData.append("n", "1");
      formData.append("size", "1024x1024");
      
      // Call the variations API
      const variationsResponse = await fetch('https://api.openai.com/v1/images/variations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData
      });
      
      if (!variationsResponse.ok) {
        const error = await variationsResponse.json();
        console.error("OpenAI variations API error:", error);
        throw new Error(error.error?.message || `OpenAI variations API error: ${variationsResponse.status}`);
      }
      
      const data = await variationsResponse.json();
      
      return new Response(
        JSON.stringify({
          imageUrl: data.data[0].url,
          model: actualModelId,
          provider: 'OpenAI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Standard image generation API
      console.log(`Using DALL-E 3 API with prompt: ${prompt.substring(0, 50)}...`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("OpenAI generations API error:", error);
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
      }
      
      console.log(`Successfully received response from OpenAI image generation`);
      const data = await response.json();
      console.log("Response data structure:", Object.keys(data));
      
      // DALL-E 3 always returns a revised_prompt which we can use if enhancePrompt is enabled
      const hasRevisedPrompt = data.data[0].revised_prompt;
      
      if (hasRevisedPrompt) {
        console.log("Revised prompt received from DALL-E:", data.data[0].revised_prompt.substring(0, 50) + "...");
      }
      
      return new Response(
        JSON.stringify({
          imageUrl: data.data[0].url,
          // Only include revisedPrompt if enhancePrompt was enabled
          revisedPrompt: enhancePrompt ? data.data[0].revised_prompt : undefined,
          model: actualModelId,
          provider: 'OpenAI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error in OpenAI image generation API call:", error);
    throw error;
  }
}
