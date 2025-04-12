
import { v4 as uuidv4 } from 'uuid';
import { ChatStore } from '../types';
import { AIModel } from '@/types';
import { toast } from 'sonner';
import { extractUrls } from '@/utils/urlUtils';

export const createSendMessageAction = (
  set: (state: Partial<ChatStore>) => void,
  get: () => ChatStore
) => {
  return async (content: string, images: string[] = [], files: string[] = []) => {
    const { currentConversationId, conversations, selectedModel, generateResponse } = get();
    
    if (!currentConversationId) {
      toast.error("No active conversation found");
      return;
    }
    
    const userId = localStorage.getItem('userId') || undefined;
    const timestamp = new Date();
    const messageId = uuidv4();
    
    // Extract URLs from user message
    const urls = extractUrls(content);
    let enhancedContent = content;
    let webContentFiles: string[] = [];

    // If URLs are found, try to fetch their content
    if (urls.length > 0) {
      toast.info(`Found ${urls.length} URL(s) in your message. Fetching content...`);
      
      try {
        // Use Supabase Edge Function to fetch webpage content
        const { data: braveData, error: braveError } = await supabase.functions.invoke('fetch-webpage', {
          body: { urls }
        });

        if (braveError) {
          console.error('Error fetching webpage content:', braveError);
          toast.error(`Could not fetch content from URLs: ${braveError.message}`);
        } else if (braveData && braveData.webContent) {
          // For each fetched URL, create a "file" with the webpage content
          Object.entries(braveData.webContent).forEach(([url, content]) => {
            if (content) {
              webContentFiles.push(`URL: ${url}\nContent: ${content}`);
              toast.success(`Successfully extracted content from ${url}`);
            }
          });
        }
      } catch (error) {
        console.error('Error invoking fetch-webpage function:', error);
        toast.error('Could not fetch webpage content');
      }
    }
    
    // Combine original files with web content files
    const allFiles = [...files, ...webContentFiles];
    
    // For debugging: Log what's being sent to the model
    console.log('Sending message to model:', {
      content,
      modelId: selectedModel.id,
      modelProvider: selectedModel.provider,
      imagesCount: images.length,
      filesCount: allFiles.length,
      urlsFound: urls.length,
      filesPreview: allFiles.length > 0 ? allFiles.map(f => f.substring(0, 100) + '...') : []
    });
    
    // Add user message
    set({
      conversations: conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          // Debug logging to ensure files are being properly added
          if (allFiles && allFiles.length > 0) {
            console.log(`Adding ${allFiles.length} files to message ${messageId}`);
            console.log(`First file content starts with: ${allFiles[0].substring(0, 150)}...`);
          }
          
          if (images && images.length > 0) {
            console.log(`Adding ${images.length} images to message ${messageId}`);
          }
          
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: messageId,
                content: enhancedContent,
                role: 'user',
                model: selectedModel, // Include selected model info
                timestamp,
                images, // Include any attached images
                files: allFiles   // Include any attached files (including extracted PDF text and webpage content)
              }
            ],
            updatedAt: timestamp
          };
        }
        return conv;
      })
    });
    
    // Add a slight delay before generating the AI response to improve UX
    setTimeout(() => {
      // Generate AI response
      generateResponse();
    }, 100);
  };
};
