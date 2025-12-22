import React from 'react';
import { Product } from '../types';
import { formatCurrency, formatVES } from '../utils/currency';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  exchangeRate: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, exchangeRate }) => {
  const priceInVes = product.price * exchangeRate;

  return (
    <div 
      className="group relative flex flex-col justify-between rounded-xl bg-dark-900 border border-dark-800 p-4 transition-all active:scale-95 hover:border-primary/50 hover:bg-dark-800 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
      onClick={() => onAdd(product)}
    >
      <div>
        <span className="mb-1 inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {product.category}
        </span>
        <h3 className="mb-1 text-base font-bold text-white leading-tight">
          {product.name}
        </h3>
      </div>
      
      <div className="mt-3 flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-primary leading-none">
            {formatCurrency(product.price)}
          </span>
          <span className="text-xs font-medium text-gray-500 mt-1">
            {formatVES(priceInVes)}
          </span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-dark-800 text-gray-400 transition-colors group-hover:bg-primary group-hover:text-white">
          <Plus size={16} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;