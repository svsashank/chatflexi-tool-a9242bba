
/**
 * Extracts URLs from a text string
 * @param text The text to extract URLs from
 * @returns Array of extracted URLs
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};
