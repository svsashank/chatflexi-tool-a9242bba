
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { generateImage } from '@/services/imageGenerationService';
import { supabase } from '@/integrations/supabase/client';
import { calculateImageGenerationCredits } from '@/utils/computeCredits';

export const createGenerateImageAction = (set: Function, get: Function) => async (prompt: string) => {
  set({ isImageGenerating: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const selectedModel = get().selectedModel;
    
    if (!currentConversationId) {
      toast.error('No active conversation found');
      set({ isImageGenerating: false });
      return;
    }
    
    if (!selectedModel.capabilities.includes('imageGeneration')) {
      toast.error(`${selectedModel.name} doesn't support image generation`);
      set({ isImageGenerating: false });
      return;
    }
    
    // Add user message with the image generation prompt
    const userMessageId = uuidv4();
    const timestamp = new Date();
    const userPrompt = `Generate an image: ${prompt}`;
    
    console.log(`Adding user message with prompt: ${userPrompt}`);
    
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: userMessageId,
                content: userPrompt,
                role: 'user' as const,
                model: selectedModel,
                timestamp: timestamp
              }
            ],
            updatedAt: timestamp
          }
          : conv
      )
    }));
    
    // Generate the image - use the original user prompt, not a revised one
    console.log(`Generating image with model: ${selectedModel.id}, provider: ${selectedModel.provider}`);
    console.log(`Using original prompt: ${prompt}`);
    
    const result = await generateImage(prompt, selectedModel);
    console.log('Image generation result:', result);
    
    if (!result.imageUrl) {
      throw new Error('No image URL received from the API');
    }
    
    // Calculate compute credits for image generation
    const computeCredits = calculateImageGenerationCredits(selectedModel.provider);
    
    // Add assistant message with the generated image
    const assistantMessageId = uuidv4();
    const newTimestamp = new Date();
    
    const assistantMessageContent = result.revisedPrompt 
      ? `I generated this image based on: "${result.revisedPrompt}"`
      : `Here's the image I generated:`;
      
    console.log(`Adding assistant message with content: ${assistantMessageContent}`);
    
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: assistantMessageId,
                content: assistantMessageContent,
                role: 'assistant' as const,
                model: selectedModel,
                timestamp: newTimestamp,
                generatedImage: {
                  imageUrl: result.imageUrl,
                  revisedPrompt: result.revisedPrompt
                },
                computeCredits: computeCredits,
                tokens: {
                  input: 0,
                  output: 0
                }
              }
            ],
            updatedAt: newTimestamp
          }
          : conv
      ),
      isImageGenerating: false
    }));
    
    // Check for authentication before saving to database
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      try {
        console.log("Saving image generation to database for conversation:", currentConversationId);
        
        // Update the conversation timestamp
        const { error: convError } = await supabase
          .from('conversations')
          .update({ updated_at: newTimestamp.toISOString() })
          .eq('id', currentConversationId)
          .eq('user_id', session.user.id);
          
        if (convError) {
          console.error('Error updating conversation timestamp:', convError);
        }
        
        // Save the user message
        const { error: userMsgError } = await supabase
          .from('conversation_messages')
          .insert([
            {
              id: userMessageId,
              conversation_id: currentConversationId,
              content: userPrompt,
              role: 'user',
              model_id: selectedModel.id,
              model_provider: selectedModel.provider,
              created_at: timestamp.toISOString(),
            }
          ]);
          
        if (userMsgError) {
          console.error('Error saving user image generation message:', userMsgError);
        } else {
          console.log('Successfully saved user message to database');
        }
        
        // Save the assistant message with the generated image URL and compute credits
        const { error: assistantMsgError } = await supabase
          .from('conversation_messages')
          .insert([
            {
              id: assistantMessageId,
              conversation_id: currentConversationId,
              content: assistantMessageContent,
              role: 'assistant',
              model_id: selectedModel.id,
              model_provider: selectedModel.provider,
              created_at: newTimestamp.toISOString(),
              image_url: result.imageUrl,
              revised_prompt: result.revisedPrompt,
              compute_credits: computeCredits,
              input_tokens: 0,
              output_tokens: 0
            }
          ]);
          
        if (assistantMsgError) {
          console.error('Error saving assistant image generation message:', assistantMsgError);
        } else {
          console.log('Successfully saved assistant message with image to database');
          
          // Update total user compute credits
          const { error: updateCreditsError } = await supabase.rpc(
            'update_user_compute_credits',
            { 
              p_user_id: session.user.id,
              p_credits: computeCredits
            }
          );
          
          if (updateCreditsError) {
            console.error('Error updating user compute credits:', updateCreditsError);
          } else {
            console.log(`Added ${computeCredits} image generation credits to user total`);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    } else {
      console.warn("User not authenticated, skipping database save");
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    toast.error(error.message || 'Failed to generate image');
    set({ isImageGenerating: false });
  }
};
