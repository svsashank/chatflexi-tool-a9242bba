
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { updateContextSummary } from '../utils';
import { Message } from '@/types';

export const addMessageAction = (set: Function, get: Function) => (message: Message) => {
  const currentConversationId = get().currentConversationId;

  if (!currentConversationId) {
    toast({
      title: 'Error',
      description: 'No active conversation found',
      variant: 'destructive',
    });
    return;
  }

  set(state => ({
    conversations: state.conversations.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: [...conv.messages, message] }
        : conv
    )
  }));

  // Check for authentication before saving to database
  saveMessageToDatabase(currentConversationId, message);
};

// Helper function to save message to database
async function saveMessageToDatabase(conversationId: string, message: Message) {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    try {
      console.log("Saving user message to database for conversation:", conversationId);
      
      // Prepare message data for the database
      const messageData: any = {
        id: message.id,
        conversation_id: conversationId,
        content: message.content,
        role: message.role,
        model_id: message.model.id,
        model_provider: message.model.provider,
        created_at: message.timestamp.toISOString(),
      };

      // Add images if present
      if (message.images && message.images.length > 0) {
        messageData.images = message.images;
      }

      // Handle files as a JSON object for database storage
      if (message.files && message.files.length > 0) {
        // Convert files array to a properly formatted JSONB for PostgreSQL
        messageData.files = JSON.stringify(message.files);
      }

      // Add token information if present
      if (message.tokens) {
        messageData.input_tokens = message.tokens.input;
        messageData.output_tokens = message.tokens.output;
      }

      // Add compute credits if present
      if (message.computeCredits) {
        messageData.compute_credits = message.computeCredits;
      }

      // Web search results if present
      if (message.webSearchResults && message.webSearchResults.length > 0) {
        messageData.web_search_results = message.webSearchResults;
      }

      // File search results if present
      if (message.fileSearchResults && message.fileSearchResults.length > 0) {
        messageData.file_search_results = message.fileSearchResults;
      }

      const { error } = await supabase
        .from('conversation_messages')
        .insert([messageData]);

      if (error) {
        console.error('Error saving message to database:', error);
        toast({
          title: 'Error',
          description: 'Failed to save message to database',
          variant: 'destructive',
        });
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
}
