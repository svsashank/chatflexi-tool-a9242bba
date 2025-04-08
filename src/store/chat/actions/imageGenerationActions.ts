
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { generateImage } from '@/services/imageGenerationService';
import { supabase } from '@/integrations/supabase/client';

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
    
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: userMessageId,
                content: `Generate an image: ${prompt}`,
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
    
    // Generate the image
    console.log(`Generating image with model: ${selectedModel.id}, provider: ${selectedModel.provider}`);
    const result = await generateImage(prompt, selectedModel);
    console.log('Image generation result:', result);
    
    if (!result.imageUrl) {
      throw new Error('No image URL received from the API');
    }
    
    // Add assistant message with the generated image
    const assistantMessageId = uuidv4();
    const newTimestamp = new Date();
    
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: assistantMessageId,
                content: result.revisedPrompt 
                  ? `I generated this image based on: "${result.revisedPrompt}"`
                  : `Here's the image I generated:`,
                role: 'assistant' as const,
                model: selectedModel,
                timestamp: newTimestamp,
                generatedImage: {
                  imageUrl: result.imageUrl,
                  revisedPrompt: result.revisedPrompt
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
              content: `Generate an image: ${prompt}`,
              role: 'user',
              model_id: selectedModel.id,
              model_provider: selectedModel.provider,
              created_at: timestamp.toISOString(),
            }
          ]);
          
        if (userMsgError) {
          console.error('Error saving user image generation message:', userMsgError);
        }
        
        // Save the assistant message with the generated image URL
        const { error: assistantMsgError } = await supabase
          .from('conversation_messages')
          .insert([
            {
              id: assistantMessageId,
              conversation_id: currentConversationId,
              content: result.revisedPrompt 
                ? `I generated this image based on: "${result.revisedPrompt}"`
                : `Here's the image I generated:`,
              role: 'assistant',
              model_id: selectedModel.id,
              model_provider: selectedModel.provider,
              created_at: newTimestamp.toISOString(),
              generated_image_url: result.imageUrl,
              revised_prompt: result.revisedPrompt
            }
          ]);
          
        if (assistantMsgError) {
          console.error('Error saving assistant image generation message:', assistantMsgError);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    toast.error(error.message || 'Failed to generate image');
    set({ isImageGenerating: false });
  }
};
