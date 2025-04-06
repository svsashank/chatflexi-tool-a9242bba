
import { v4 as uuidv4 } from 'uuid';
import { sendMessageToLLM } from '@/services/llmService';
import { toast } from '@/components/ui/use-toast';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { supabase } from '@/integrations/supabase/client';
import { updateContextSummary } from '../utils';

export const createRegenerateMessageAction = (set: Function, get: Function) => async () => {
  set({ isLoading: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const currentConversation = get().conversations.find(c => c.id === currentConversationId);
    const selectedModel = get().selectedModel;
    
    if (!currentConversation || currentConversation.messages.length < 2) {
      toast({
        title: 'Error',
        description: 'No message to regenerate',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }
    
    // Get the last user message and remove the assistant message
    let messages = [...currentConversation.messages];
    const lastAssistantMessageIndex = messages.map(m => m.role).lastIndexOf('assistant');
    
    if (lastAssistantMessageIndex === -1) {
      toast({
        title: 'Error',
        description: 'No assistant message to regenerate',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }
    
    // Remove the last assistant message
    messages = messages.slice(0, lastAssistantMessageIndex);
    
    // Find the last user message 
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      toast({
        title: 'Error',
        description: 'No user message found to respond to',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }
    
    // First update the conversation to remove the assistant message
    set(state => ({
      conversations: state.conversations.map(conv => 
        conv.id === currentConversationId
          ? { ...conv, messages }
          : conv
      ),
    }));
    
    // Send the last user message content to the LLM
    // Also pass any images that were in the last user message
    const aiResponse = await sendMessageToLLM(
      lastUserMessage.content,
      selectedModel,
      messages
    );
    
    if (aiResponse) {
      // Extract token counts and calculate compute credits
      const tokens = aiResponse.tokens || { input: 0, output: 0 };
      const computeCredits = calculateComputeCredits(
        tokens.input,
        tokens.output,
        selectedModel.id
      );
      
      const newMessage = {
        id: uuidv4(),
        content: aiResponse.content,
        role: 'assistant' as const,
        model: selectedModel,
        timestamp: new Date(),
        tokens: tokens,
        computeCredits: computeCredits
      };
      
      const updatedContextSummary = updateContextSummary(
        currentConversation.contextSummary,
        newMessage
      );
      
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === currentConversationId
            ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: new Date(),
              contextSummary: updatedContextSummary,
            }
            : conv
        ),
        isLoading: false,
      }));
      
      // Check for authentication before saving to database
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        try {
          console.log("Saving regenerated assistant message to database for conversation:", currentConversationId);
          
          // Delete the previous assistant message from the database if it exists
          const { data: prevMessages, error: fetchError } = await supabase
            .from('conversation_messages')
            .select('id')
            .eq('conversation_id', currentConversationId)
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (fetchError) {
            console.error('Error fetching previous message:', fetchError);
          } else if (prevMessages && prevMessages.length > 0) {
            // Delete the previous message
            const { error: deleteError } = await supabase
              .from('conversation_messages')
              .delete()
              .eq('id', prevMessages[0].id);
              
            if (deleteError) {
              console.error('Error deleting previous message:', deleteError);
            }
          }
          
          // Save the new message to the database
          const { error } = await supabase
            .from('conversation_messages')
            .insert([
              {
                id: newMessage.id,
                conversation_id: currentConversationId,
                content: newMessage.content,
                role: newMessage.role,
                model_id: selectedModel.id,
                model_provider: selectedModel.provider,
                created_at: newMessage.timestamp.toISOString(),
                input_tokens: tokens.input,
                output_tokens: tokens.output,
                compute_credits: computeCredits
              },
            ]);
            
          if (error) {
            console.error('Error saving regenerated message to database:', error);
            toast({
              title: 'Error',
              description: 'Failed to save regenerated message to database',
              variant: 'destructive',
            });
          } else {
            // Update the conversation timestamp
            const { error: timestampError } = await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', currentConversationId);
              
            if (timestampError) {
              console.error('Error updating conversation timestamp:', timestampError);
            }
              
            // Update the user's total compute credits
            try {
              const userId = session.user.id;
              console.log(`Updating user ${userId} compute credits for regeneration: +${computeCredits} credits`);
              
              // Check if a record exists for the user
              const { data: existingRecord, error: checkError } = await supabase
                .from('user_compute_credits')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
                
              if (checkError) {
                console.error('Error checking user compute credits record:', checkError);
              }
              
              if (!existingRecord) {
                console.log("No existing credit record found, creating one");
                const { error: insertError } = await supabase
                  .from('user_compute_credits')
                  .insert([
                    { 
                      user_id: userId,
                      total_credits: computeCredits 
                    }
                  ]);
                  
                if (insertError) {
                  console.error('Error creating user compute credits record:', insertError);
                }
              } else {
                // Use the RPC function to update existing records
                const { error: creditError } = await supabase.rpc(
                  'update_user_compute_credits',
                  { 
                    p_user_id: userId,
                    p_credits: computeCredits
                  }
                );
                
                if (creditError) {
                  console.error('Error updating user compute credits:', creditError);
                }
              }
            } catch (creditUpdateError) {
              console.error('Error handling compute credits update:', creditUpdateError);
            }
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          toast({
            title: 'Error',
            description: 'Failed to save regenerated message to database',
            variant: 'destructive',
          });
        }
      }
    } else {
      toast({
        title: 'Error',
        description: 'Failed to regenerate response',
        variant: 'destructive',
      });
      set({ isLoading: false });
    }
  } catch (error) {
    console.error('Error regenerating response:', error);
    toast({
      title: 'Error',
      description: 'Failed to regenerate response',
      variant: 'destructive',
    });
    set({ isLoading: false });
  }
};
