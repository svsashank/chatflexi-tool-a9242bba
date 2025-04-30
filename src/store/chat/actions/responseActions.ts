import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMessageToLLM } from '@/services/llmService';
import { calculateComputeCredits } from '@/utils/computeCredits';
import { updateContextSummary } from '../utils';
import { updateCachedBalance } from '@/services/creditValidationService';

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
      const userId = session.user.id;
      
      // Optimistically update the cached balance
      // This will make the UI responsive without waiting for a server call
      try {
        const { data: currentCredit } = await supabase
          .from('user_compute_credits')
          .select('credit_balance')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (currentCredit?.credit_balance) {
          const newBalance = Math.max(0, currentCredit.credit_balance - computeCredits);
          updateCachedBalance(userId, newBalance);
        }
      } catch (err) {
        console.error("Error updating cached balance:", err);
      }

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

// Existing saveMessageToDatabase function with modification to deduct credits
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
    
    // Insert the message
    const { error } = await supabase
      .from('conversation_messages')
      .insert([messageInsertData]);

    if (error) {
      console.error('Error saving message to database:', error);
      toast.error('Failed to save message to database');
    } else {
      // Update the user's credit balance by deducting the compute credits
      deductCreditsFromUserBalance(userId, computeCredits);
    }
  } catch (error) {
    console.error('Error saving message to database:', error);
  }
}

// New function to deduct credits from user balance
async function deductCreditsFromUserBalance(userId: string, creditAmount: number) {
  try {
    console.log(`Deducting ${creditAmount} credits from user ${userId}`);
    
    // First try using the RPC function to deduct credits
    const { error: rpcError } = await supabase.rpc(
      'deduct_user_credits',
      { 
        p_user_id: userId,
        p_credits: creditAmount
      }
    );
    
    if (rpcError) {
      console.error('Error deducting credits via RPC:', rpcError);
      
      // Fallback: Direct update with balance check
      const { data: currentCredit, error: getError } = await supabase
        .from('user_compute_credits')
        .select('id, credit_balance')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (getError) {
        console.error('Error getting current credit balance:', getError);
        return;
      }
      
      if (!currentCredit) {
        // Create a new record with the initial credits if none exists
        const { error: insertError } = await supabase
          .from('user_compute_credits')
          .insert([
            { 
              user_id: userId,
              credit_balance: 1000 - creditAmount // Start with initial balance minus this usage
            }
          ]);
          
        if (insertError) {
          console.error('Error creating user credit record:', insertError);
        } else {
          console.log(`Created new credit record with ${1000 - creditAmount} balance`);
        }
      } else {
        // Update existing balance - ensure we don't go below 0
        const newBalance = Math.max(0, (currentCredit.credit_balance || 0) - creditAmount);
        
        const { error: updateError } = await supabase
          .from('user_compute_credits')
          .update({ 
            credit_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentCredit.id);
          
        if (updateError) {
          console.error('Error updating credit balance:', updateError);
        } else {
          console.log(`Updated credit balance to ${newBalance}`);
        }
      }
    } else {
      console.log(`Successfully deducted ${creditAmount} credits`);
    }
  } catch (error) {
    console.error('Error handling credit deduction:', error);
  }
}
