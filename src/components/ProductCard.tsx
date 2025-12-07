import { WooCommerceProduct } from '../services/woocommerceService';

interface ProductCardProps {
  product: WooCommerceProduct;
  onClick?: (product: WooCommerceProduct) => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return isNaN(numPrice) ? price : `$${numPrice.toFixed(2)}`
  };

  const getStockStatus = (status: string) => {
    switch (status) {
      case 'instock':
        return { text: 'In Stock', color: 'text-green-600 bg-green-50' };
      case 'outofstock':
        return { text: 'Out of Stock', color: 'text-red-600 bg-red-50' };
      case 'onbackorder':
        return { text: 'On Backorder', color: 'text-yellow-600 bg-yellow-50' };
      default:
        return { text: status, color: 'text-gray-600 bg-gray-50' }
    }
  };

  const stockInfo = getStockStatus(product.stock_status);

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
      }`}
    >
      {product.images && product.images.length > 0 && (
        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <img
            src={product.images[0].src}
            alt={product.images[0].alt || product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {product.short_description && (
          <div
            className="text-sm text-gray-600 mb-3 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.regular_price !== product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.regular_price)}
              </span>
            )}
          </div>

          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              stockInfo.color
            }`}
          >
            {stockInfo.text}
          </span>
        </div>

        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.categories.slice(0, 3).map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}

        {product.sku && (
          <div className="mt-2 text-xs text-gray-500">
            SKU: {product.sku}
          </div>
        )}
      </div>
    </div>
  )
}