
import { AIModel } from "@/types";

// Constants for estimation
const AVG_TOKENS_PER_CHAR = 0.25;
const IMAGE_TOKEN_COST = 1000; // Rough estimate per image
const FILE_TOKEN_MULTIPLIER = 0.3; // Estimate for text in files
const OUTPUT_TOKEN_MULTIPLIER = 1.5; // Estimate output tokens based on input

/**
 * Estimate token usage based on message content and attachments
 */
export const estimateTokenUsage = (
  content: string,
  model: AIModel,
  imageCount: number = 0,
  fileCount: number = 0
): { 
  input: number;
  output: number;
  reasoning?: number;
} => {
  // Character-based estimation of tokens
  const textTokens = content.length * AVG_TOKENS_PER_CHAR;
  
  // Add token cost for images if the model supports vision
  const imageTokens = model.capabilities.includes('images') ? imageCount * IMAGE_TOKEN_COST : 0;
  
  // Add token cost for files (rough estimation)
  const fileTokens = fileCount * content.length * FILE_TOKEN_MULTIPLIER;
  
  // Total input tokens
  const inputTokens = Math.max(1, Math.ceil(textTokens + imageTokens + fileTokens));
  
  // Estimate output and reasoning tokens
  const outputTokens = Math.ceil(inputTokens * OUTPUT_TOKEN_MULTIPLIER);
  
  // If model supports reasoning, estimate reasoning tokens too
  const reasoningTokens = model.capabilities.includes('reasoning') 
    ? Math.ceil(outputTokens * 0.8) 
    : undefined;
  
  return {
    input: inputTokens,
    output: outputTokens,
    reasoning: reasoningTokens
  };
};

/**
 * Get real-time cost estimate as user types
 */
export const getTypingCostEstimate = (
  content: string,
  model: AIModel,
  imageCount: number = 0,
  fileCount: number = 0
): number => {
  // Only update estimates periodically for performance
  if (content.length % 10 !== 0 && content.length > 10) {
    return 0; // Skip calculation for most keystrokes
  }
  
  const tokens = estimateTokenUsage(content, model, imageCount, fileCount);
  
  // Simple cost calculation (would be replaced by actual rates)
  return tokens.input * 0.01 + tokens.output * 0.02 + (tokens.reasoning || 0) * 0.03;
};
