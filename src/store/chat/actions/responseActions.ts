
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMessageToLLM } from '@/services/llmService';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { updateContextSummary } from '../utils';

export const generateResponseAction = (set: Function, get: Function) => async () => {
  // Prevent duplicate response generation
  if (get().isLoading) {
    console.log("Response generation already in progress");
    return;
  }
  
  set({ isLoading: true });
  
  try {
    const currentConversationId = get().currentConversationId;
    const currentConversation = get().conversations.find(c => c.id === currentConversationId);
    const selectedModel = get().selectedModel;

    if (!currentConversationId || !currentConversation) {
      toast.error('No active conversation found');
      set({ isLoading: false });
      return;
    }

    const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      toast.error('Please send a message first');
      set({ isLoading: false });
      return;
    }

    const aiResponse = await sendMessageToLLM(
      lastMessage.content,
      selectedModel,
      currentConversation.messages
    );

    // Extract tokens, including reasoning tokens if present
    const tokens = {
      input: aiResponse.tokens?.input || 0,
      output: aiResponse.tokens?.output || 0,
      reasoning: aiResponse.tokens?.reasoning
    };
    
    // Calculate compute credits with reasoning tokens if available
    const computeCredits = calculateComputeCredits(
      tokens.input, 
      tokens.output, 
      selectedModel.id,
      tokens.reasoning
    );

    // Log the token counts and credit calculation for debugging
    console.log(`Token counts for ${selectedModel.id}:`, tokens);
    console.log(`Calculated compute credits: ${computeCredits}`);

    const newMessage = {
      id: uuidv4(),
      content: aiResponse.content,
      role: 'assistant' as const,
      model: selectedModel,
      timestamp: new Date(),
      tokens,
      computeCredits,
      webSearchResults: aiResponse.webSearchResults || [],
      fileSearchResults: aiResponse.fileSearchResults || [],
      reasoningContent: aiResponse.reasoningContent
    };

    const updatedContextSummary = updateContextSummary(currentConversation.contextSummary, newMessage);

    // Update state with the new message
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
      isLoading: false
    }));

    // Asynchronously save to database without blocking UI
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      saveMessageToDatabase(
        session.user.id, 
        currentConversationId, 
        newMessage, 
        selectedModel, 
        currentConversation, 
        computeCredits,
        lastMessage
      ).catch(err => {
        console.error('Background database save error:', err);
      });
    }
  } catch (error) {
    console.error('Error in response generation:', error);
    toast.error('Failed to generate response. Please try again.');
    set({ isLoading: false });
  }
};

// Existing saveMessageToDatabase function remains the same
async function saveMessageToDatabase(
  userId: string, 
  conversationId: string, 
  message: any, 
  selectedModel: any, 
  conversation: any,
  computeCredits: number,
  lastUserMessage: any
) {
  try {
    console.log("Saving assistant message to database for conversation:", conversationId);
    
    // First, check if the conversation exists and has the correct user_id
    const { data: convData, error: convCheckError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
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
          id: conversationId,
          user_id: userId,
          title: conversation.title,
          created_at: conversation.createdAt.toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (createConvError) {
        console.error('Error creating conversation:', createConvError);
        toast.error('Failed to create conversation in database');
        return;
      }
      console.log('Successfully created conversation in database');
    } else if (convData.user_id !== userId) {
      console.error('Conversation belongs to a different user');
      toast.error('You do not have permission to access this conversation');
      return;
    }
    
    // Update the conversation timestamp
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (conversationError) {
      console.error('Error updating conversation timestamp:', conversationError);
      toast.error('Failed to update conversation timestamp');
    }
    
    // Prepare the message insert data with all available info
    const messageInsertData = {
      id: message.id,
      conversation_id: conversationId,
      content: message.content,
      role: message.role,
      model_id: selectedModel.id,
      model_provider: selectedModel.provider,
      created_at: message.timestamp.toISOString(),
      input_tokens: message.tokens?.input || 0,
      output_tokens: message.tokens?.output || 0,
      compute_credits: computeCredits,
    };
    
    // Add web search results if they exist
    if (message.webSearchResults && message.webSearchResults.length > 0) {
      Object.assign(messageInsertData, {
        web_search_results: message.webSearchResults
      });
      console.log('Adding web search results to the database');
    }
    
    // Add file search results if they exist
    if (message.fileSearchResults && message.fileSearchResults.length > 0) {
      Object.assign(messageInsertData, {
        file_search_results: message.fileSearchResults
      });
    }
    
    // If the last user message had images, include those for reference
    if (lastUserMessage?.images && lastUserMessage.images.length > 0) {
      Object.assign(messageInsertData, {
        images: lastUserMessage.images
      });
    }
    
    // Handle files from the last user message - convert to JSON string
    if (lastUserMessage?.files && lastUserMessage.files.length > 0) {
      const files = JSON.stringify(lastUserMessage.files);
      Object.assign(messageInsertData, {
        files
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
      // Update the user's total compute credits using RPC with better error handling
      updateUserComputeCredits(userId, computeCredits);
    }
  } catch (error) {
    console.error('Error saving message to database:', error);
  }
}

// Extract the compute credits update to a separate function with improved error handling
async function updateUserComputeCredits(userId: string, computeCredits: number) {
  try {
    console.log(`Updating user ${userId} compute credits: +${computeCredits} credits`);
    
    // First try using the RPC function which handles both insert and update
    const { error: rpcError } = await supabase.rpc(
      'update_user_compute_credits',
      { 
        p_user_id: userId,
        p_credits: computeCredits
      }
    );
    
    if (rpcError) {
      console.error('Error updating user compute credits via RPC:', rpcError);
      
      // Fallback: Check if a record exists for the user
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_compute_credits')
        .select('id, total_credits')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking user compute credits record:', checkError);
        return;
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
          // If there's a duplicate key error, another request likely created it,
          // so now update it through an update operation
          if (insertError.code === '23505') {
            console.log("Duplicate key detected, trying update instead");
            // Get current credits and then update
            const { data: currentCredits, error: getError } = await supabase
              .from('user_compute_credits')
              .select('total_credits')
              .eq('user_id', userId)
              .single();
              
            if (getError) {
              console.error('Error getting current credits:', getError);
            } else {
              // Calculate new total
              const newTotal = (currentCredits?.total_credits || 0) + computeCredits;
              
              const { error: updateError } = await supabase
                .from('user_compute_credits')
                .update({ 
                  total_credits: newTotal,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
                
              if (updateError) {
                console.error('Error updating user compute credits after duplicate key:', updateError);
              }
            }
          } else {
            console.error('Error creating user compute credits record:', insertError);
          }
        } else {
          console.log(`Created new credit record with ${computeCredits} credits`);
        }
      } else {
        // Update existing record directly by adding to existing value
        const newTotal = (existingRecord.total_credits || 0) + computeCredits;
        
        const { error: updateError } = await supabase
          .from('user_compute_credits')
          .update({ 
            total_credits: newTotal,
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
          
        if (updateError) {
          console.error('Error updating existing user compute credits record:', updateError);
        } else {
          console.log(`Updated user compute credits via direct update: +${computeCredits} credits`);
        }
      }
    } else {
      console.log(`Updated user compute credits: +${computeCredits} credits`);
    }
  } catch (error) {
    console.error('Error handling compute credits update:', error);
  }
}
