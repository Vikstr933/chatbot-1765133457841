import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ProductCard } from './components/ProductCard';
import { SettingsPanel, Settings } from './components/SettingsPanel';
import { openAIService } from './services/openaiService';
import { wooCommerceService, WooCommerceProduct } from './services/woocommerceService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: WooCommerceProduct[];
}

const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: '',
  woocommerceUrl: '',
  woocommerceConsumerKey: '',
  woocommerceConsumerSecret: ''
};

const STORAGE_KEYS = {
  SETTINGS: 'woocommerce-chatbot-settings',
  MESSAGES: 'woocommerce-chatbot-messages'
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        if (parsed.openaiApiKey) {
          openAIService.setApiKey(parsed.openaiApiKey);
        }
        if (parsed.woocommerceUrl && parsed.woocommerceConsumerKey && parsed.woocommerceConsumerSecret) {
          wooCommerceService.configure(
            parsed.woocommerceUrl,
            parsed.woocommerceConsumerKey,
            parsed.woocommerceConsumerSecret
          );
          checkConnection();
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    } else {
      setIsSettingsOpen(true);
    }

    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const messagesWithDates = parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const testProducts = await wooCommerceService.getProducts(1);
      if (testProducts && testProducts.length >= 0) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const fetchedProducts = await wooCommerceService.getProducts(20);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      addMessage('assistant', 'Failed to load products. Please check your WooCommerce connection settings.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    
    if (newSettings.openaiApiKey) {
      openAIService.setApiKey(newSettings.openaiApiKey);
    }
    
    if (newSettings.woocommerceUrl && newSettings.woocommerceConsumerKey && newSettings.woocommerceConsumerSecret) {
      wooCommerceService.configure(
        newSettings.woocommerceUrl,
        newSettings.woocommerceConsumerKey,
        newSettings.woocommerceConsumerSecret
      );
      checkConnection();
      loadProducts();
    }
    
    setIsSettingsOpen(false);
  };

  const addMessage = (role: 'user' | 'assistant', content: string, relatedProducts?: WooCommerceProduct[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      products: relatedProducts
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const findRelevantProducts = (query: string): WooCommerceProduct[] => {
    if (!products.length) return [];
    
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    const scoredProducts = products.map(product => {
      let score = 0;
      const productText = `${product.name} ${product.description} ${product.short_description} ${product.categories.map(c => c.name).join(' ')}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (productText.includes(keyword)) {
          score += 1;
        }
        if (product.name.toLowerCase().includes(keyword)) {
          score += 3;
        }
      });
      
      return { product, score };
    });
    
    return scoredProducts
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.product);
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!settings.openaiApiKey) {
      addMessage('assistant', 'Please configure your OpenAI API key in settings to use the chatbot.');
      setIsSettingsOpen(true);
      return;
    }

    if (!settings.woocommerceUrl || !settings.woocommerceConsumerKey) {
      addMessage('assistant', 'Please configure your WooCommerce connection in settings to access product information.');
      setIsSettingsOpen(true);
      return;
    }

    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      if (products.length === 0) {
        await loadProducts();
      }

      const relevantProducts = findRelevantProducts(userMessage);
      
      const productContext = relevantProducts.length > 0
        ? `\n\nRelevant products from our catalog:\n${relevantProducts.map(p => 
            `- ${p.name}: ${p.short_description || p.description.substring(0, 100)} (Price: $${p.price}, Stock: ${p.stock_status})`
          ).join('\n')}`
        : '\n\nNo specific products found matching your query, but I can help with general information.';

      const systemPrompt = `You are a helpful shopping assistant for a WooCommerce store. You have access to the store's product catalog and can help customers find products, answer questions about them, and provide recommendations. Be friendly, concise, and helpful. When discussing products, mention their key features and prices.${productContext}`;

      const response = await openAIService.sendMessage(userMessage, systemPrompt);
      
      addMessage('assistant', response, relevantProducts.length > 0 ? relevantProducts : undefined)
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your message.';
      addMessage('assistant', `Sorry, I encountered an error: ${errorMessage}. Please check your API key and try again.`)
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear all messages?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }
  };

  const handleProductClick = (product: WooCommerceProduct) => {
    setSelectedProduct(product)
  };

  const isConfigured = settings.openaiApiKey && settings.woocommerceUrl && settings.woocommerceConsumerKey;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">WooCommerce AI Assistant</h1>
                <p className="text-sm text-gray-500">Powered by OpenAI GPT-4o Mini</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {connectionStatus === 'connected' && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </div>
              )}
              {connectionStatus === 'disconnected' && isConfigured && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 rounded-full">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">Disconnected</span>
                </div>
              )}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label="Clear chat history"
                >
                  Clear Chat
                </button>
              )}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm"
                aria-label="Open settings"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {!isConfigured ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to WooCommerce AI Assistant</h2>
              <p className="text-gray-600 mb-6">
                To get started, please configure your OpenAI API key and WooCommerce store connection in the settings.
              </p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg font-medium"
              >
                Configure Settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a Conversation</h3>
                    <p className="text-gray-600 mb-4">
                      Ask me anything about your products, inventory, or get recommendations for your customers.
                    </p>
                    <div className="space-y-2 text-left bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <p className="text-sm font-medium text-gray-700">Try asking:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• "What products do you have in stock?"</li>
                        <li>• "Tell me about your best-selling items"</li>
                        <li>• "Do you have any products under $50?"</li>
                        <li>• "What's available in the electronics category?"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id}>
                      <ChatMessage
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                      />
                      {message.products && message.products.length > 0 && (
                        <div className="ml-12 mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Related Products:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {message.products.map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onClick={handleProductClick}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="py-4 bg-white border-t border-gray-200">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                disabled={!isConfigured}
                placeholder={isLoadingProducts ? 'Loading products...' : 'Ask about products...'}
              />
            </div>
          </>
        )}
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={settings}
      />

      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close product details"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedProduct.images.length > 0 && (
                <img
                  src={selectedProduct.images[0].src}
                  alt={selectedProduct.images[0].alt || selectedProduct.name}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-blue-600">${selectedProduct.price}</p>
                  {selectedProduct.regular_price !== selectedProduct.price && (
                    <p className="text-lg text-gray-500 line-through">${selectedProduct.regular_price}</p>
                  )}
                </div>
                <div dangerouslySetInnerHTML={{ __html: selectedProduct.description }} className="text-gray-700 prose max-w-none" />
                {selectedProduct.categories.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.categories.map((category) => (
                        <span
                          key={category.id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">SKU: {selectedProduct.sku || 'N/A'}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProduct.stock_status === 'instock'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {selectedProduct.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}