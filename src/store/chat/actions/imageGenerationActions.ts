
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { generateImage } from '@/services/imageGenerationService';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { GeneratedImage } from '@/services/imageGenerationService';

// Export the action creator function
export const createGenerateImageAction = (set: Function, get: Function) => {
  return {
    generateImage: async (prompt: string, enhancePrompt: boolean = true): Promise<GeneratedImage | void> => {
      const { currentConversationId, conversations, selectedModel } = get();
      
      if (!currentConversationId) {
        toast({
          title: 'Error',
          description: 'No active conversation',
          variant: 'destructive',
        });
        return;
      }
      
      if (!selectedModel.capabilities.includes('imageGeneration')) {
        toast({
          title: 'Error',
          description: `${selectedModel.name} doesn't support image generation`,
          variant: 'destructive',
        });
        return;
      }
      
      // Set loading state
      set({ isImageGenerating: true });
      
      try {
        // Add user message with prompt
        const userMessageId = uuidv4();
        const timestamp = new Date();
        
        console.log(`Adding user message with prompt: ${prompt}`);
        
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
                    role: 'user',
                    model: selectedModel,
                    timestamp,
                  }
                ],
                updatedAt: timestamp
              }
              : conv
          )
        }));
        
        // Generate the image - use the original user prompt, not a modified one
        console.log(`Generating image with model: ${selectedModel.id}, provider: ${selectedModel.provider}`);
        console.log(`Using original prompt: ${prompt}`);
        console.log(`Enhance prompt: ${enhancePrompt}`);
        
        const result = await generateImage(prompt, selectedModel, enhancePrompt);
        
        // Create the assistant message with the generated image
        const assistantMessageId = uuidv4();
        const responseTimestamp = new Date();
        
        // Calculate compute credits for image generation
        // Using a fixed amount for image generation
        const imageGenerationCredits = 1000;
        
        let responseMessage = enhancePrompt && result.revisedPrompt
          ? `I generated this image based on: "${result.revisedPrompt}"`
          : `I generated this image based on your prompt: "${prompt}"`;
        
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === currentConversationId
              ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  {
                    id: assistantMessageId,
                    content: responseMessage,
                    role: 'assistant',
                    model: selectedModel,
                    timestamp: responseTimestamp,
                    generatedImage: {
                      imageUrl: result.imageUrl,
                      revisedPrompt: result.revisedPrompt
                    },
                    computeCredits: imageGenerationCredits
                  }
                ],
                updatedAt: responseTimestamp
              }
              : conv
          ),
          isImageGenerating: false
        }));
        
        // Check for authentication before saving to database
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          try {
            console.log(`Saving image generation to database for conversation: ${currentConversationId}`);
            
            // Update the conversation timestamp
            const { error: conversationError } = await supabase
              .from('conversations')
              .update({ updated_at: responseTimestamp.toISOString() })
              .eq('id', currentConversationId);
              
            if (conversationError) {
              console.error('Error updating conversation timestamp:', conversationError);
            }
            
            // Save user message
            const { error: userMsgError } = await supabase
              .from('conversation_messages')
              .insert([{
                id: userMessageId,
                conversation_id: currentConversationId,
                content: `Generate an image: ${prompt}`,
                role: 'user',
                model_id: selectedModel.id,
                model_provider: selectedModel.provider,
                created_at: timestamp.toISOString()
              }]);
              
            if (userMsgError) {
              console.error('Error saving user message:', userMsgError);
              toast({
                title: 'Error',
                description: 'Failed to save message to database',
                variant: 'destructive',
              });
            } else {
              console.log('Successfully saved user message to database');
            }
            
            // Save assistant message with the image
            const { error: assistantMsgError } = await supabase
              .from('conversation_messages')
              .insert([{
                id: assistantMessageId,
                conversation_id: currentConversationId,
                content: responseMessage,
                role: 'assistant',
                model_id: selectedModel.id,
                model_provider: selectedModel.provider,
                created_at: responseTimestamp.toISOString(),
                input_tokens: 0,
                output_tokens: 0,
                compute_credits: imageGenerationCredits,
                image_url: result.imageUrl,
                revised_prompt: result.revisedPrompt
              }]);
              
            if (assistantMsgError) {
              console.error('Error saving assistant message:', assistantMsgError);
              toast({
                title: 'Error',
                description: 'Failed to save message to database',
                variant: 'destructive',
              });
            } else {
              console.log('Successfully saved assistant message with image to database');
            }
            
            // Update user's compute credits
            console.log(`Fetching credits for user: ${session.user.id}`);
            const { data: existingCredits } = await supabase
              .from('user_compute_credits')
              .select('total_credits')
              .eq('user_id', session.user.id)
              .maybeSingle();
              
            console.log(`Fetched total credits: ${existingCredits?.total_credits}`);
            
            try {
              const { error: creditError } = await supabase.rpc(
                'update_user_compute_credits',
                { 
                  p_user_id: session.user.id,
                  p_credits: imageGenerationCredits
                }
              );
              
              if (creditError) {
                console.error('Error updating compute credits:', creditError);
              } else {
                console.log(`Added ${imageGenerationCredits} image generation credits to user total`);
              }
            } catch (creditError) {
              console.error('Error updating compute credits:', creditError);
            }
            
          } catch (dbError) {
            console.error('Database error:', dbError);
            toast({
              title: 'Error',
              description: 'Database error when saving image generation',
              variant: 'destructive',
            });
          }
        } else {
          console.log('User not authenticated, skipping database save');
        }
        
        return result;
      } catch (error: any) {
        console.error('Error generating image:', error);
        toast({
          title: 'Image Generation Failed',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        
        set({ isImageGenerating: false });
        throw error;
      }
    },
    
    setImageGenerating: (isGenerating: boolean) => {
      set({ isImageGenerating: isGenerating });
    }
  };
};
