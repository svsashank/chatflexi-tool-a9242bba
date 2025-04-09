import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { sendMessageToLLM } from '@/services/llmService';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { updateContextSummary } from '../utils';

export const generateResponseAction = (set: Function, get: Function) => async () => {
  set({ isLoading: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const currentConversation = get().conversations.find(c => c.id === currentConversationId);
    const selectedModel = get().selectedModel;

    if (!currentConversationId || !currentConversation) {
      toast({
        title: 'Error',
        description: 'No active conversation found',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }

    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      toast({
        title: 'Error',
        description: 'Please send a message first',
        variant: 'destructive',
      });
      set({ isLoading: false });
      return;
    }

    const aiResponse = await sendMessageToLLM(
      lastMessage.content,
      selectedModel,
      currentConversation.messages
    );
    
    if (aiResponse.content.startsWith('Error:')) {
      console.log('Response contained error, will auto-retry in 2 seconds');
      setTimeout(() => {
        console.log('Auto-retrying generateResponse...');
        set({ isLoading: true });
        generateResponseAction(set, get)();
      }, 2000);
      set({ isLoading: false });
      return;
    }

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
        computeCredits: computeCredits,
        webSearchResults: aiResponse.webSearchResults || [],
        fileSearchResults: aiResponse.fileSearchResults || []
      };

      const updatedContextSummary = updateContextSummary(currentConversation.contextSummary, newMessage);

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
          console.log("Saving assistant message to database for conversation:", currentConversationId);
          
          // First, check if the conversation exists and has the correct user_id
          const { data: convData, error: convCheckError } = await supabase
            .from('conversations')
            .select('id, user_id')
            .eq('id', currentConversationId)
            .maybeSingle();
            
          if (convCheckError) {
            console.error('Error checking conversation:', convCheckError);
            toast({
              title: 'Error',
              description: 'Failed to verify conversation ownership',
              variant: 'destructive',
            });
            return;
          }
          
          if (!convData) {
            console.log('Conversation not found in database, creating it now...');
            // Create the conversation if it doesn't exist
            const { error: createConvError } = await supabase
              .from('conversations')
              .insert([{
                id: currentConversationId,
                user_id: session.user.id,
                title: currentConversation.title,
                created_at: currentConversation.createdAt.toISOString(),
                updated_at: new Date().toISOString()
              }]);
              
            if (createConvError) {
              console.error('Error creating conversation:', createConvError);
              toast({
                title: 'Error',
                description: 'Failed to create conversation in database',
                variant: 'destructive',
              });
              return;
            }
            console.log('Successfully created conversation in database');
          } else if (convData.user_id !== session.user.id) {
            console.error('Conversation belongs to a different user');
            toast({
              title: 'Error',
              description: 'You do not have permission to access this conversation',
              variant: 'destructive',
            });
            return;
          }
          
          // Update the conversation timestamp
          const { error: conversationError } = await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId)
            .eq('user_id', session.user.id);

          if (conversationError) {
            console.error('Error updating conversation timestamp:', conversationError);
            toast({
              title: 'Warning',
              description: 'Failed to update conversation timestamp',
              variant: 'destructive',
            });
          }
          
          // Check if the conversation_messages table has web_search_results and file_search_results columns
          // If not, we'll still insert but without those fields
          const { error: schemaError } = await supabase
            .from('conversation_messages')
            .select('web_search_results, file_search_results')
            .limit(1)
            .maybeSingle();
            
          const hasSearchResultsColumns = !schemaError;
          
          // Then save the message
          const messageInsertData = {
            id: newMessage.id,
            conversation_id: currentConversationId,
            content: newMessage.content,
            role: newMessage.role,
            model_id: selectedModel.id,
            model_provider: selectedModel.provider,
            created_at: newMessage.timestamp.toISOString(),
            input_tokens: tokens.input,
            output_tokens: tokens.output,
            compute_credits: computeCredits,
          };
          
          // Only add these properties if the columns exist in the database
          if (hasSearchResultsColumns) {
            Object.assign(messageInsertData, {
              web_search_results: newMessage.webSearchResults.length > 0 ? newMessage.webSearchResults : null,
              file_search_results: newMessage.fileSearchResults.length > 0 ? newMessage.fileSearchResults : null
            });
          }
          
          const { error } = await supabase
            .from('conversation_messages')
            .insert([messageInsertData]);

          if (error) {
            console.error('Error saving message to database:', error);
            toast({
              title: 'Error',
              description: 'Failed to save message to database',
              variant: 'destructive',
            });
          } else {
            // Update the user's total compute credits using RPC
            try {
              const userId = session.user.id;
              console.log(`Updating user ${userId} compute credits: +${computeCredits} credits`);
              
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
                  toast({
                    title: 'Warning',
                    description: 'Failed to create compute credits record',
                    variant: 'destructive',
                  });
                } else {
                  console.log(`Created new credit record with ${computeCredits} credits`);
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
                  toast({
                    title: 'Warning',
                    description: 'Failed to update compute credits',
                    variant: 'destructive',
                  });
                } else {
                  console.log(`Updated user compute credits: +${computeCredits} credits`);
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
            description: 'Failed to save message to database',
            variant: 'destructive',
          });
        }
      } else {
        console.warn("User not authenticated, skipping database save");
      }
    } else {
      toast({
        title: 'Error',
        description: 'Failed to generate response',
        variant: 'destructive',
      });
      set({ isLoading: false });
    }
  } catch (error) {
    console.error('Error generating response:', error);
    set({ isLoading: false });
    toast({
      title: 'Error',
      description: 'Failed to generate response. Please try again.',
      variant: 'destructive',
    });
  }
};
