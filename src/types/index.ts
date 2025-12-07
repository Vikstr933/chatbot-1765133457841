// Chat Message Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date
}

// WooCommerce Product Types
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: 'simple' | 'grouped' | 'external' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  categories: WooCommerceCategory[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[]
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string
}

export interface WooCommerceImage {
  id: number;
  src: string;
  name: string;
  alt: string
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[]
}

// WooCommerce Connection Config
export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  isConnected: boolean
}

// OpenAI API Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number
}

// API Configuration
export interface APIConfig {
  openaiApiKey: string;
  openaiModel: 'gpt-4o-mini' | 'gpt-3.5-turbo'
}

// Application State
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null
}

export interface ProductState {
  products: WooCommerceProduct[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null
}

// Settings
export interface AppSettings {
  woocommerce: WooCommerceConfig;
  openai: APIConfig
}

// Error Types
export interface APIError {
  message: string;
  code?: string;
  status?: number;
}
