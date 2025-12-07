export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number
}

export const openAIConfig: OpenAIConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7
};

export function validateOpenAIConfig(): boolean {
  return Boolean(openAIConfig.apiKey);
}

export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export function getOpenAIHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openAIConfig.apiKey}`
  };
}

export const SYSTEM_PROMPT = `You are a helpful e-commerce assistant for a WooCommerce store. Your role is to:
- Help customers find products based on their needs
- Answer questions about product details, pricing, and availability
- Provide recommendations based on customer preferences
- Assist with general store information

When answering:
- Be friendly, professional, and concise
- Use the product information provided to give accurate answers
- If you don't have specific information, be honest about it
- Always prioritize customer satisfaction
- Format prices clearly with currency symbols
- Mention stock availability when relevant`;
