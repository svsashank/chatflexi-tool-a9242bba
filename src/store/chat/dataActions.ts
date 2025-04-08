
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { ChatStore } from './types';
import { AI_MODELS, DEFAULT_MODEL } from '@/constants';

export const loadUserConversationsAction = (
  set: (state: Partial<ChatStore>) => void
) => async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn("User not authenticated, cannot load conversations");
      return;
    }

    // Fetch conversations for the current user
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .eq('user_id', session.user.id);

    if (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: 'Error',
        description: 'Failed to fetch conversations',
        variant: 'destructive',
      });
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log("No conversations found, creating a new one");
      set({
        conversations: [{
          id: uuidv4(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          contextSummary: '',
          userId: session.user.id
        }],
        currentConversationId: null
      });
      return;
    }

    // Fetch messages for most recent conversation
    const mostRecentConversation = conversations[0];
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', mostRecentConversation.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      toast({
        title: 'Error',
        description: 'Failed to fetch messages for conversation',
        variant: 'destructive',
      });
    }
    
    console.log("Loaded messages from database:", messages);
    
    // Map database messages to app format
    const mappedMessages = (messages || []).map(msg => {
      // Find the model in our constants
      const model = AI_MODELS.find(m => m.id === msg.model_id && m.provider === msg.model_provider) || DEFAULT_MODEL;
      
      // Create the basic message structure
      const message: any = {
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        model: model,
        timestamp: new Date(msg.created_at),
        tokens: msg.input_tokens !== null && msg.output_tokens !== null ? {
          input: msg.input_tokens,
          output: msg.output_tokens
        } : undefined,
        computeCredits: msg.compute_credits || undefined,
        images: [] // Initialize with empty array
      };
      
      // Check for image URLs in message - using type assertion since the field may not be in the type
      const msgAny = msg as any;
      if (msgAny.images) {
        message.images = Array.isArray(msgAny.images) ? msgAny.images : [];
      }
      
      // Check if the message has image generation fields - using type assertion
      if (msgAny.image_url) {
        message.generatedImage = {
          imageUrl: msgAny.image_url,
          revisedPrompt: msgAny.revised_prompt
        };
        console.log("Found generated image:", message.generatedImage);
      }
      
      return message;
    });

    // Convert the DB conversation to app format
    const loadedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      messages: conv.id === mostRecentConversation.id ? mappedMessages : [],
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      contextSummary: '',
      userId: session.user.id
    }));
    
    set({
      conversations: loadedConversations,
      currentConversationId: mostRecentConversation.id
    });
  } catch (error) {
    console.error("Error loading user conversations:", error);
    toast({
      title: 'Error',
      description: 'Failed to load conversations',
      variant: 'destructive',
    });
  }
};
