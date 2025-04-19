
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatStore } from "./types";

// Conversation action states
export const conversationStates = {
  loading: false,
  creating: false,
  deleting: new Set<string>(),
  updating: new Set<string>(),
};

// Function to generate a meaningful title based on user message
export const generateConversationTitleFromMessage = (message: string) => {
  // Remove special characters and normalize spaces
  const cleanMessage = message.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  
  // Limit to first 5-8 words for a reasonable title length
  const words = cleanMessage.split(' ');
  const titleWords = words.slice(0, Math.min(8, Math.max(5, words.length)));
  let title = titleWords.join(' ');
  
  // Add ellipsis if truncated and capitalize first letter
  if (words.length > titleWords.length) {
    title += '...';
  }
  
  // Ensure title isn't too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  // If still empty after processing, use default title
  if (!title || title.length < 3) {
    title = 'New Conversation';
  }
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
};
