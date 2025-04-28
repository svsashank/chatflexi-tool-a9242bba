
// Compute credits conversion rates by model
export const COMPUTE_CREDITS_PER_TOKEN: Record<string, number> = {
  // Google Models
  'google/gemini-2.5-pro-preview-03-25': 6.5,
  'google/gemini-2.0-flash-lite-001': 0.195,
  'google/gemini-2.0-flash-001': 0.26,
  'google/gemini-flash-1.5-8b': 0.0975,
  'google/gemini-flash-1.5': 0.195,
  'google/gemini-pro-1.5': 3.25,
  
  // OpenAI Models
  'openai/o4-mini-high': 2.86,
  'openai/o3': 26,
  'openai/o4-mini': 2.86,
  'openai/gpt-4.1': 5.2,
  'openai/gpt-4.1-mini': 1.04,
  'openai/gpt-4.1-nano': 0.26,
  'openai/o1-pro': 390,
  'openai/o3-mini-high': 2.86,
  'openai/o3-mini': 2.86,
  'openai/o1': 39,
  'openai/gpt-4o-2024-11-20': 6.5,
  'openai/o1-preview': 39,
  'openai/o1-preview-2024-09-12': 39,
  'openai/o1-mini-2024-09-12': 2.86,
  'openai/chatgpt-4o-latest': 9.75,
  'openai/gpt-4o-2024-08-06': 6.5,
  'openai/gpt-4o-mini': 0.39,
  'openai/gpt-4o': 6.5,
  'openai/gpt-4o-2024-05-13': 9.75,
  
  // Anthropic Models
  'anthropic/claude-3.7-sonnet': 9.75,
  'anthropic/claude-3.7-sonnet:thinking': 9.75,
  'anthropic/claude-3.5-haiku': 2.6,
  'anthropic/claude-3.5-sonnet': 9.75,
  'anthropic/claude-3-haiku': 0.8125,
  'anthropic/claude-3-opus': 48.75,
  
  // xAI Models
  'x-ai/grok-3-mini-beta': 0.325,
  'x-ai/grok-3-beta': 9.75,
  'x-ai/grok-2-vision-1212': 6.5,
  'x-ai/grok-2-1212': 6.5,
  
  // DeepSeek Models
  'deepseek/deepseek-chat-v3-0324': 0.715,
  'deepseek/deepseek-r1': 1.4235,
  
  // Legacy models (for backward compatibility)
  'claude-3-5-haiku-20240307': 2.6,
  'claude-3-5-sonnet-20241022': 9.75,
  'claude-3-7-sonnet-20250219': 9.75,
  'claude-3-opus-20240229': 48.75,
  'gemini-1.5-flash': 0.195,
  'gemini-1.5-pro': 3.25,
  'gemini-1.0-pro': 0.27,
  'gemini-pro-vision': 0.27,
  'gemini-ultra': 3.38,
  'gemini-1.5-flash-8k': 0.0975,
  'gpt-3.5-turbo': 1.35,
  'gpt-4.5-preview': 5.2,
  'o1': 39,
  'o1-mini': 2.86,
  'o1-pro': 390,
  'o3-mini': 2.86,
  'gpt-4o': 6.5,
  'gpt-4o-mini': 0.39,
  'deepseek-r1': 1.4235,
  'deepseek-r1-llama-70b': 0.08,
  'deepseek-r1-llama-8b': 0.02,
  'deepseek-r1-qwen-14b': 0.08,
  'grok-2-latest': 6.5,
  'grok-3': 9.75,
  'grok-3-mini': 0.325,
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
