import { openAIConfig, OPENAI_API_URL, getOpenAIHeaders, SYSTEM_PROMPT, validateOpenAIConfig } from '../config/openai';
import { wooCommerceService, WooCommerceProduct } from './woocommerceService';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number
  };
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

class OpenAIService {
  private conversationHistory: ChatMessage[] = [];
  private productCache: WooCommerceProduct[] = [];
  private productCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor() {
    if (!validateOpenAIConfig()) {
      console.warn('OpenAI configuration is incomplete. Please set VITE_OPENAI_API_KEY environment variable.');
    }
    this.initializeConversation();
  }

  private initializeConversation(): void {
    this.conversationHistory = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ]
  }

  private async getProductContext(): Promise<string> {
    const now = Date.now();
    
    if (this.productCache.length === 0 || (now - this.productCacheTime) > this.CACHE_DURATION) {
      try {
        this.productCache = await wooCommerceService.fetchProducts({ per_page: 50 });
        this.productCacheTime = now;
      } catch (error) {
        console.error('Failed to fetch products for context:', error);
        return 'Product information is currently unavailable.';
      }
    }

    return wooCommerceService.formatProductsForAI(this.productCache);
  }

  private async enhanceMessageWithContext(userMessage: string): Promise<string> {
    const productContext = await this.getProductContext();
    
    return `Available Products:\n${productContext}\n\nCustomer Question: ${userMessage}`
  }

  async sendMessage(userMessage: string, includeProductContext: boolean = true): Promise<string> {
    try {
      if (!validateOpenAIConfig()) {
        throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.')
      }

      let messageContent = userMessage;
      if (includeProductContext) {
        messageContent = await this.enhanceMessageWithContext(userMessage);
      }

      const userMessageObj: ChatMessage = {
        role: 'user',
        content: messageContent
      };

      this.conversationHistory.push(userMessageObj);

      const requestBody: ChatCompletionRequest = {
        model: openAIConfig.model,
        messages: this.conversationHistory,
        max_tokens: openAIConfig.maxTokens,
        temperature: openAIConfig.temperature
      };

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: getOpenAIHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData: OpenAIError = await response.json().catch(() => ({
          error: {
            message: 'An unknown error occurred',
            type: 'unknown_error'
          }
        }));
        throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`)
      }

      const data: ChatCompletionResponse = await response.json();
      const assistantMessage = data.choices[0].message;

      this.conversationHistory.push(assistantMessage);

      return assistantMessage.content;
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      throw error;
    }
  }

  async searchProductsAndRespond(searchQuery: string): Promise<string> {
    try {
      const products = await wooCommerceService.searchProducts(searchQuery, 10);
      
      if (products.length === 0) {
        return this.sendMessage(
          `I searched for "${searchQuery}" but couldn't find any matching products. Can you help me find what I'm looking for?`,
          false
        );
      }

      const productInfo = wooCommerceService.formatProductsForAI(products);
      const message = `I found ${products.length} product(s) matching "${searchQuery}":\n\n${productInfo}\n\nPlease provide a helpful response about these products.`;
      
      return this.sendMessage(message, false);
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  clearConversation(): void {
    this.initializeConversation();
  }

  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  async refreshProductCache(): Promise<void> {
    try {
      this.productCache = await wooCommerceService.fetchProducts({ per_page: 50 });
      this.productCacheTime = Date.now();
    } catch (error) {
      console.error('Failed to refresh product cache:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
