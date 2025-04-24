
// Compute credits conversion rates by model
export const COMPUTE_CREDITS_PER_TOKEN: Record<string, number> = {
  'claude-3-5-haiku-20240307': 2.70,
  'claude-3-5-sonnet-20241022': 10.13,
  'claude-3-7-sonnet-20250219': 10.13,
  'claude-3-opus-20240229': 50.63,
  'gemini-1.5-flash': 0.20,
  'gemini-1.5-pro': 6.75,
  'gemini-1.0-pro': 0.27,
  'gemini-pro-vision': 0.27,
  'gemini-ultra': 3.38,
  'gemini-1.5-flash-8k': 0.10,
  'gemini-2.5-pro-preview-03-25': 13.50,
  'gpt-3.5-turbo': 1.35,
  'gpt-4.5-preview': 101.25,
  'o1': 40.50,
  'o1-mini': 2.97,
  'o1-pro': 405.00,
  'o3-mini': 2.97,
  'gpt-4o': 6.75,
  'gpt-4o-mini': 6.75,
  'deepseek-r1': 0.36,
  'deepseek-r1-llama-70b': 0.08,
  'deepseek-r1-llama-8b': 0.02,
  'deepseek-r1-qwen-14b': 0.08,
  'grok-2-latest': 6.75,
  'grok-3': 1.87,
  'grok-3-mini': 0.06,
};

// Default value if model is not found
const DEFAULT_CREDIT_PER_TOKEN = 1.0;

/**
 * Calculate compute credits based on token count and model ID
 */
export const calculateComputeCredits = (
  inputTokens: number, 
  outputTokens: number, 
  modelId: string
): number => {
  const totalTokens = inputTokens + outputTokens;
  const creditsPerToken = COMPUTE_CREDITS_PER_TOKEN[modelId] || DEFAULT_CREDIT_PER_TOKEN;
  
  // Calculate total credits (multiply token count by rate)
  const totalCredits = totalTokens * creditsPerToken;
  
  // Round to 2 decimal places
  return Math.round(totalCredits * 100) / 100;
};
