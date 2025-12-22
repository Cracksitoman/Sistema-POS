import React from 'react';
import { CartItem } from '../types';
import { formatCurrency } from '../utils/currency';
import { Minus, Plus } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onIncrement, onDecrement }) => {
  return (
    <div className="flex items-center justify-between rounded-lg bg-dark-800/40 p-3 border border-transparent hover:border-dark-700 hover:bg-dark-800/60 transition-colors">
      
      {/* Details */}
      <div className="flex flex-col min-w-0 pr-4">
        <h4 className="font-medium text-sm text-white truncate">{item.name}</h4>
        <div className="text-xs text-gray-400">
          {formatCurrency(item.price)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-white text-sm tabular-nums">
            {formatCurrency(item.price * item.quantity)}
        </span>
        
        <div className="flex items-center gap-2 rounded-md bg-dark-950 p-1 border border-dark-800">
          <button 
            onClick={(e) => { e.stopPropagation(); onDecrement(item.id); }}
            className="flex h-5 w-5 items-center justify-center rounded bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <Minus size={12} />
          </button>
          
          <span className="w-4 text-center text-xs font-semibold text-white">
            {item.quantity}
          </span>

          <button 
            onClick={(e) => { e.stopPropagation(); onIncrement(item.id); }}
            className="flex h-5 w-5 items-center justify-center rounded bg-primary text-white hover:bg-secondary transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItemRow;