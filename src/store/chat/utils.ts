import { Message } from '@/types';

// Helper function to update context summary
export const updateContextSummary = (currentSummary: string, message: Message): string => {
  // For simplicity, we'll just keep a running list of the last few interactions
  // In a more advanced system, you could use an LLM to generate a proper summary
  const role = message.role === 'user' ? 'User' : 'Krix';
  const newEntry = `${role}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`;
  
  // Split by lines, add new entry, and keep only the last 5 entries
  const summaryLines = currentSummary ? currentSummary.split('\n') : [];
  summaryLines.push(newEntry);
  
  return summaryLines.slice(-5).join('\n');
};
