import { useState, useEffect, useCallback } from 'react';
import { wooCommerceService, WooCommerceProduct } from '../services/woocommerceService';

export interface UseProductsReturn {
  products: WooCommerceProduct[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasProducts: boolean
}

export interface UseProductsOptions {
  autoFetch?: boolean;
  perPage?: number;
  category?: number;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { autoFetch = true, perPage = 100, category } = options;

  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        per_page: perPage,
        status: 'publish'
      };

      if (category) {
        params.category = category;
      }

      const fetchedProducts = await wooCommerceService.getProducts(params);
      setProducts(fetchedProducts);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(errorMessage);
      setProducts([]);
      console.error('Error fetching products:', err)
    } finally {
      setIsLoading(false);
    }
  }, [perPage, category]);

  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
    hasProducts: products.length > 0
  }
}
