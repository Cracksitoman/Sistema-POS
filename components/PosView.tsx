
import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, Wallet, CreditCard, Banknote, Smartphone, CheckCircle2, DollarSign, User, ChefHat, Zap } from 'lucide-react';
import { CartItem, Product, PaymentMethod, OrderStatus } from '../types';
import ProductCard from './ProductCard';
import CartItemRow from './CartItemRow';
import ExchangeRateModal from './ExchangeRateModal';
import { formatCurrency, formatVES } from '../utils/currency';

interface PosViewProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: PaymentMethod, customerName?: string, status?: OrderStatus) => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => void;
  onRefreshRate: () => void;
  isLoadingRate: boolean;
}

const PosView: React.FC<PosViewProps> = ({ products, onCheckout, exchangeRate, onUpdateExchangeRate, onRefreshRate, isLoadingRate }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'kitchen' | 'direct'>('kitchen');

  const totals = useMemo(() => {
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalVES = total * exchangeRate;
    return { total, itemCount, totalVES };
  }, [cart, exchangeRate]);

  const confirmPayment = () => {
    const status: OrderStatus = deliveryType === 'direct' ? 'completed' : 'pending';
    onCheckout(cart, totals.total, selectedMethod, customerName, status);
    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <header className="flex items-center justify-between border-b border-dark-800 bg-dark-950/95 px-4 py-3 md:px-6 md:py-5">
          <div><h1 className="text-lg font-bold text-white">Venta</h1><p className="text-[10px] text-gray-500 uppercase font-semibold">FastPOS Catálogo</p></div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsRateModalOpen(true)} className="flex items-center gap-2 bg-dark-900 border border-dark-800 rounded-lg px-3 py-1.5 transition-all group">
              <div className="flex flex-col items-start"><span className="text-[8px] uppercase font-bold text-gray-500">Tasa</span><span className="text-xs font-bold text-white">{formatVES(exchangeRate)}</span></div>
            </button>
            <div className="relative w-full max-w-[140px] md:max-w-[200px]"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" /><input type="text" placeholder="Buscar..." className="w-full rounded-lg border border-dark-800 bg-dark-900 py-1.5 pl-9 pr-3 text-xs text-white outline-none focus:border-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filteredProducts.map((p) => <ProductCard key={p.id} product={p} onAdd={(prod) => setCart(prev => { const ex = prev.find(i => i.id === prod.id); return ex ? prev.map(i => i.id === prod.id ? {...i, quantity: i.quantity + 1} : i) : [...prev, {...prod, quantity: 1}]; })} exchangeRate={exchangeRate} />)}</div></main>
      </div>
      <aside className="flex w-full flex-col border-t md:border-t-0 md:border-l border-dark-800 bg-dark-900 md:w-[380px] z-20 h-[40vh] md:h-auto">
        <div className="hidden md:flex items-center justify-between border-b border-dark-800 p-5"><h2 className="font-bold text-white">Carrito</h2><div className="rounded-full bg-dark-800 px-2 py-0.5 text-[10px] font-medium text-primary border border-dark-700">{totals.itemCount} Items</div></div>
        <div className="flex-1 overflow-y-auto p-4 bg-dark-900">{cart.length === 0 ? <div className="flex h-full flex-col items-center justify-center opacity-40"><ShoppingBag size={32} className="mb-2" /><p className="text-sm">Orden vacía</p></div> : cart.map((item) => <CartItemRow key={item.id} item={item} onIncrement={(id) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: i.quantity + 1} : i))} onDecrement={(id) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: i.quantity - 1} : i).filter(i => i.quantity > 0))} onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))} />)}</div>
        <div className="bg-dark-950 p-4 border-t border-dark-800"><div className="mb-4 flex flex-col gap-1"><div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Total USD</span><span className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span></div><div className="flex items-center justify-between"><span className="text-gray-500 text-xs">Total BS</span><span className="text-sm font-bold text-gray-300">{formatVES(totals.totalVES)}</span></div></div><button onClick={() => setIsCheckoutModalOpen(true)} disabled={cart.length === 0} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white hover:bg-secondary active:scale-[0.98] disabled:opacity-50"><Wallet size={18} /><span>Cobrar</span></button></div>
      </aside>
      <ExchangeRateModal isOpen={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} currentRate={exchangeRate} onUpdate={onUpdateExchangeRate} onRefresh={onRefreshRate} isLoading={isLoadingRate} />
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"><div className="w-full max-w-sm rounded-2xl bg-dark-950 border border-dark-800 flex flex-col shadow-2xl overflow-hidden">
          <div className="bg-dark-900 p-5 border-b border-dark-800 text-center"><h3 className="text-white text-lg font-bold">Resumen de Pago</h3><span className="text-2xl font-black text-primary block mt-1">{formatCurrency(totals.total)}</span><span className="text-sm font-bold text-gray-400">{formatVES(totals.totalVES)}</span></div>
          <div className="p-5 space-y-5">
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Nombre del Cliente (Opcional)</label><div className="relative"><User className="absolute left-3 top-2.5 text-gray-600" size={16} /><input type="text" placeholder="Ej. Pedro" className="w-full bg-dark-900 border border-dark-800 rounded-xl py-2 pl-9 pr-3 text-white outline-none focus:border-primary text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">¿Enviar a preparación?</label><div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDeliveryType('kitchen')} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${deliveryType === 'kitchen' ? 'bg-primary/20 border-primary text-primary' : 'bg-dark-900 border-dark-800 text-gray-500'}`}><ChefHat size={20} /><span className="text-[10px] font-bold">Cocina</span></button>
              <button onClick={() => setDeliveryType('direct')} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${deliveryType === 'direct' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-dark-900 border-dark-800 text-gray-500'}`}><Zap size={20} /><span className="text-[10px] font-bold">Directo</span></button>
            </div></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Método de Pago</label><div className="grid grid-cols-2 gap-2">
              {['cash', 'card', 'mobile', 'zelle'].map((m) => <button key={m} onClick={() => setSelectedMethod(m as PaymentMethod)} className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${selectedMethod === m ? 'bg-primary/20 border-primary text-primary' : 'bg-dark-900 border-dark-800 text-gray-500'}`}>{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Punto' : m === 'mobile' ? 'Pago Móvil' : 'Zelle'}</button>)}
            </div></div>
            <div className="flex gap-2 pt-2"><button onClick={() => setIsCheckoutModalOpen(false)} className="flex-1 rounded-xl bg-dark-800 py-3 text-xs font-bold">Atrás</button><button onClick={confirmPayment} className="flex-[2] rounded-xl bg-primary py-3 text-xs font-bold shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"><CheckCircle2 size={16} />Confirmar</button></div>
          </div>
        </div></div>
      )}
    </div>
  );
};
export default PosView;
