import { getWooCommerceApiUrl, getWooCommerceAuthParams, validateWooCommerceConfig } from '../config/woocommerce';

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  categories: Array<{
    id: number;
    name: string;
    slug: string
  }>;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[]
  }>;
}

export interface WooCommerceError {
  code: string;
  message: string;
  data?: {
    status: number
  };
}

export interface FetchProductsParams {
  per_page?: number;
  page?: number;
  search?: string;
  category?: string;
  status?: string;
  orderby?: string;
  order?: 'asc' | 'desc';
}

class WooCommerceService {
  private baseUrl: string;
  private authParams: string;

  constructor() {
    if (!validateWooCommerceConfig()) {
      console.warn('WooCommerce configuration is incomplete. Please set environment variables.');
    }
    this.baseUrl = '';
    this.authParams = '';
    this.initialize();
  }

  private initialize(): void {
    try {
      this.authParams = getWooCommerceAuthParams();
    } catch (error) {
      console.error('Failed to initialize WooCommerce service:', error)
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = getWooCommerceApiUrl(endpoint);
    const urlParams = new URLSearchParams(this.authParams);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlParams.append(key, String(value));
      });
    }

    return `${url}?${urlParams.toString()}`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: WooCommerceError = await response.json().catch(() => ({
        code: 'unknown_error',
        message: 'An unknown error occurred',
        data: { status: response.status }
      }));
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json();
  }

  async fetchProducts(params: FetchProductsParams = {}): Promise<WooCommerceProduct[]> {
    try {
      const defaultParams: FetchProductsParams = {
        per_page: 100,
        status: 'publish',
        orderby: 'date',
        order: 'desc',
        ...params
      };

      const url = this.buildUrl('products', defaultParams as Record<string, string | number>);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return this.handleResponse<WooCommerceProduct[]>(response);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async fetchProductById(productId: number): Promise<WooCommerceProduct> {
    try {
      const url = this.buildUrl(`products/${productId}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return this.handleResponse<WooCommerceProduct>(response);
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  }

  async searchProducts(searchTerm: string, limit: number = 20): Promise<WooCommerceProduct[]> {
    try {
      return this.fetchProducts({
        search: searchTerm,
        per_page: limit
      })
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  async fetchProductsByCategory(categoryId: string, limit: number = 20): Promise<WooCommerceProduct[]> {
    try {
      return this.fetchProducts({
        category: categoryId,
        per_page: limit
      })
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  formatProductForAI(product: WooCommerceProduct): string {
    const categories = product.categories.map(cat => cat.name).join(', ');
    const inStock = product.stock_status === 'instock';
    const stockInfo = inStock 
      ? (product.stock_quantity ? `${product.stock_quantity} in stock` : 'In stock')
      : 'Out of stock';

    return `Product: ${product.name}\n` +
           `Price: $${product.price}${product.on_sale ? ` (Sale from $${product.regular_price})` : ''}\n` +
           `SKU: ${product.sku}\n` +
           `Categories: ${categories}\n` +
           `Stock: ${stockInfo}\n` +
           `Description: ${product.short_description.replace(/<[^>]*>/g, '')}\n` +
           `Link: ${product.permalink}`
  }

  formatProductsForAI(products: WooCommerceProduct[]): string {
    if (products.length === 0) {
      return 'No products found.'
    }

    return products.map((product, index) => 
      `${index + 1}. ${this.formatProductForAI(product)}`
    ).join('\n\n');
  }
}

export const wooCommerceService = new WooCommerceService();
