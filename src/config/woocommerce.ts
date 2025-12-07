export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string
}

export const wooCommerceConfig: WooCommerceConfig = {
  storeUrl: import.meta.env.VITE_WOOCOMMERCE_STORE_URL || '',
  consumerKey: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY || '',
  consumerSecret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET || ''
};

export function validateWooCommerceConfig(): boolean {
  return Boolean(
    wooCommerceConfig.storeUrl &&
    wooCommerceConfig.consumerKey &&
    wooCommerceConfig.consumerSecret
  );
}

export function getWooCommerceApiUrl(endpoint: string): string {
  const baseUrl = wooCommerceConfig.storeUrl.replace(/\/$/, '');
  return `${baseUrl}/wp-json/wc/v3/${endpoint}`;
}

export function getWooCommerceAuthParams(): string {
  return `consumer_key=${encodeURIComponent(wooCommerceConfig.consumerKey)}&consumer_secret=${encodeURIComponent(wooCommerceConfig.consumerSecret)}`;
}