import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMessageToLLM } from '@/services/llmService';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { updateContextSummary } from '../utils';

export const generateResponseAction = (set: Function, get: Function) => async () => {
  if (get().isLoading) {
    console.log("Already generating a response, skipping duplicate request");
    return;
  }
  
  set({ isLoading: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const currentConversation = get().conversations.find(c => c.id === currentConversationId);
    const selectedModel = get().selectedModel;
    const handleError = get().handleError;

    if (!currentConversationId || !currentConversation) {
      handleError('No active conversation found');
      return;
    }

    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      handleError('Please send a message first');
      return;
    }

    console.log("Generating response for message:", {
      content: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
      hasImages: lastMessage.images && lastMessage.images.length > 0,
      hasFiles: lastMessage.files && lastMessage.files.length > 0,
      filesCount: lastMessage.files?.length || 0
    });
    
    // If there are files, log them for debugging
    if (lastMessage.files && lastMessage.files.length > 0) {
      console.log("File content preview:", 
        lastMessage.files[0].substring(0, 150) + (lastMessage.files[0].length > 150 ? '...' : ''));
    }

    let retryCount = 0;
    const maxRetries = 3;
    let aiResponse;
    
    while (retryCount < maxRetries) {
      try {
        aiResponse = await sendMessageToLLM(
          lastMessage.content,
          selectedModel,
          currentConversation.messages
        );
        
        if (aiResponse && !aiResponse.content.startsWith('Error:')) {
          break; // Successful response
        }
        
        // If we get an error response, retry
        retryCount++;
        console.log(`AI response contained error (attempt ${retryCount}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      } catch (callError) {
        retryCount++;
        console.error(`Error calling LLM API (attempt ${retryCount}/${maxRetries}):`, callError);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
    
    if (!aiResponse || aiResponse.content.startsWith('Error:')) {
      handleError('Failed to generate a response after multiple attempts. Please try again.');
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
      
      // Create the new message object with all necessary data
      const newMessage = {
        id: uuidv4(),
        content: aiResponse.content,
        role: 'assistant' as const,
        model: selectedModel,
        timestamp: new Date(),
        tokens: tokens,
        computeCredits: computeCredits,
        webSearchResults: aiResponse.webSearchResults || [],
        fileSearchResults: aiResponse.fileSearchResults || [],
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
            toast.error('Failed to verify conversation ownership');
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
              toast.error('Failed to create conversation in database');
              return;
            }
            console.log('Successfully created conversation in database');
          } else if (convData.user_id !== session.user.id) {
            console.error('Conversation belongs to a different user');
            toast.error('You do not have permission to access this conversation');
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
            toast.error('Failed to update conversation timestamp');
          }
          
          // Prepare the message insert data with all available info
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
          
          // Add web search results if they exist
          if (newMessage.webSearchResults && newMessage.webSearchResults.length > 0) {
            console.log('Adding web search results to the database');
            Object.assign(messageInsertData, {
              web_search_results: newMessage.webSearchResults
            });
          }
          
          // Add file search results if they exist
          if (newMessage.fileSearchResults && newMessage.fileSearchResults.length > 0) {
            console.log('Adding file search results to the database');
            Object.assign(messageInsertData, {
              file_search_results: newMessage.fileSearchResults
            });
          }
          
          // If the last user message had images, include those for reference
          const lastUserMessage = currentConversation.messages.filter(m => m.role === 'user').pop();
          if (lastUserMessage?.images && lastUserMessage.images.length > 0) {
            console.log('Adding reference to images from the user query');
            Object.assign(messageInsertData, {
              images: lastUserMessage.images
            });
          }
          
          // Insert the message
          const { error } = await supabase
            .from('conversation_messages')
            .insert([messageInsertData]);

          if (error) {
            console.error('Error saving message to database:', error);
            toast.error('Failed to save message to database');
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
                  toast.error('Failed to create compute credits record');
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
                  toast.error('Failed to update compute credits');
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
          toast.error('Failed to save message to database');
        }
      } else {
        console.warn("User not authenticated, skipping database save");
      }
    } else {
      handleError('Failed to generate response');
    }
  } catch (error) {
    console.error('Error generating response:', error);
    const handleError = get().handleError;
    handleError('Failed to generate response. Please try again.');
  }
};
