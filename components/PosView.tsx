import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, Wallet, CreditCard, Banknote, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react';
import { CartItem, Product, PaymentMethod } from '../types';
import ProductCard from './ProductCard';
import CartItemRow from './CartItemRow';
import ExchangeRateModal from './ExchangeRateModal';
import { formatCurrency, formatVES } from '../utils/currency';

interface PosViewProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: PaymentMethod) => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => void;
  onRefreshRate: () => void;
  isLoadingRate: boolean;
}

const PosView: React.FC<PosViewProps> = ({ 
  products, 
  onCheckout, 
  exchangeRate, 
  onUpdateExchangeRate,
  onRefreshRate,
  isLoadingRate
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Increment Quantity
  const handleIncrement = (id: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  // Decrement Quantity (Remove if 0)
  const handleDecrement = (id: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove Item Completely
  const handleRemove = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal; 
    const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalVES = total * exchangeRate;
    return { subtotal, total, itemCount, totalVES };
  }, [cart, exchangeRate]);

  // Handle Initial Click on "Cobrar"
  const openCheckoutModal = () => {
    if (cart.length === 0) return;
    setSelectedMethod('cash'); // Reset to default
    setIsCheckoutModalOpen(true);
  };

  // Finalize Payment
  const confirmPayment = () => {
    onCheckout(cart, totals.total, selectedMethod);
    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  // Filter Products
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      
      {/* LEFT SIDE: Menu & Products */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-dark-800 bg-dark-950/95 backdrop-blur-sm px-4 py-3 md:px-6 md:py-5">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none text-white">Venta</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Selección de productos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            
            {/* Exchange Rate Button (Opens Modal) */}
            <button 
              onClick={() => setIsRateModalOpen(true)}
              className="flex items-center gap-2 bg-dark-900 border border-dark-800 hover:border-primary/50 hover:bg-dark-800 rounded-lg px-3 py-1.5 transition-all group"
              title="Configurar Tasa de Cambio"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500">
                <Banknote size={12} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] uppercase font-bold text-gray-500 leading-none mb-0.5">Tasa BCV</span>
                <span className="text-xs font-bold text-white leading-none group-hover:text-primary transition-colors">
                  {formatVES(exchangeRate)}
                </span>
              </div>
            </button>

            {/* Search */}
            <div className="relative w-full max-w-[140px] md:max-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                className="block w-full rounded-lg border border-dark-800 bg-dark-900 py-1.5 pl-9 pr-3 text-xs md:text-sm text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={handleAddToCart}
                exchangeRate={exchangeRate}
              />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-dark-800 text-gray-500">
              <p className="text-sm">No se encontraron productos.</p>
            </div>
          )}
        </main>
      </div>

      {/* RIGHT SIDE: Cart / Order Summary */}
      <aside className="flex w-full flex-col border-t md:border-t-0 md:border-l border-dark-800 bg-dark-900 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] md:shadow-none md:w-[380px] z-20 h-[40vh] md:h-auto">
        
        {/* Mobile Handle / Desktop Header */}
        <div className="hidden md:flex items-center justify-between border-b border-dark-800 p-5">
          <h2 className="font-bold text-white">Orden Actual</h2>
          <div className="rounded-full bg-dark-800 px-2 py-0.5 text-[10px] font-medium text-primary border border-dark-700">
            En Curso
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-dark-900">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-40 py-4">
              <ShoppingBag size={32} className="mb-2 text-gray-500" />
              <p className="text-sm font-medium text-gray-500">Orden vacía</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Totals & Checkout */}
        <div className="bg-dark-950 p-4 md:p-6 border-t border-dark-800">
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total USD</span>
              <span className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(totals.total)}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Total BS</span>
               <span className="text-sm font-bold text-gray-300">{formatVES(totals.totalVES)}</span>
            </div>
          </div>

          <button 
            onClick={openCheckoutModal}
            disabled={cart.length === 0}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Wallet className="h-4 w-4" />
            <span>Cobrar</span>
          </button>
        </div>
      </aside>

      {/* Exchange Rate Modal */}
      <ExchangeRateModal 
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        currentRate={exchangeRate}
        onUpdate={onUpdateExchangeRate}
        onRefresh={onRefreshRate}
        isLoading={isLoadingRate}
      />

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl overflow-hidden">
            
            <div className="bg-dark-950 p-6 text-center border-b border-dark-800">
              <h3 className="text-gray-400 text-sm font-medium mb-1">Total a cobrar</h3>
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl font-bold text-white">{formatCurrency(totals.total)}</span>
                <span className="text-lg font-medium text-gray-400">{formatVES(totals.totalVES)}</span>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider text-center">Seleccionar Método de Pago</label>
              
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button
                  onClick={() => setSelectedMethod('cash')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all ${
                    selectedMethod === 'cash' 
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                      : 'bg-dark-800 border-transparent text-gray-400 hover:bg-dark-700'
                  }`}
                >
                  <Banknote size={24} />
                  <span className="text-xs font-bold">Efectivo</span>
                </button>
                
                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all ${
                    selectedMethod === 'card' 
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                      : 'bg-dark-800 border-transparent text-gray-400 hover:bg-dark-700'
                  }`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold">Tarjeta</span>
                </button>
                
                <button
                  onClick={() => setSelectedMethod('mobile')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all ${
                    selectedMethod === 'mobile' 
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                      : 'bg-dark-800 border-transparent text-gray-400 hover:bg-dark-700'
                  }`}
                >
                  <Smartphone size={24} />
                  <span className="text-xs font-bold">Pago Móvil</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="flex-1 rounded-xl bg-dark-800 py-3.5 text-sm font-bold text-white hover:bg-dark-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} />
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosView;