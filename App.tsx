
import React, { useState, useEffect, useCallback } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3, ChefHat } from 'lucide-react';
import { PRODUCTS } from './constants'; // Fallback data
import { Product, CartItem, Sale, PaymentMethod, Expense, OrderStatus } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';
import OrdersView from './components/OrdersView';

type View = 'pos' | 'orders' | 'inventory' | 'stats';

const STORAGE_KEY_RATE = 'fastpos_exchange_rate';
const STORAGE_KEY_PRODUCTS = 'fastpos_products';
const STORAGE_KEY_SALES = 'fastpos_sales_'; // New versioning
const STORAGE_KEY_EXPENSES = 'fastpos_expenses';
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    return savedRate ? parseFloat(savedRate) : 45.00;
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SALES);
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(salesHistory));
  }, [salesHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString());
  }, [exchangeRate]);

  const fetchBCVRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      const response = await fetch(BCV_API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      let rate = 0;
      if (data?.promedio) rate = Number(data.promedio);
      else if (data?.price) rate = Number(data.price);
      if (rate > 0) setExchangeRate(rate);
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  useEffect(() => { fetchBCVRate(); }, [fetchBCVRate]);

  const handleCheckout = (items: CartItem[], total: number, paymentMethod: PaymentMethod, customerName?: string, status: OrderStatus = 'pending') => {
    const today = new Date().toDateString();
    const todaysOrders = salesHistory.filter(s => new Date(s.date).toDateString() === today);
    const orderNumber = todaysOrders.length + 1;

    const newSale: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderNumber,
      date: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      exchangeRate,
      status,
      customerName: customerName || `Cliente ${orderNumber}`
    };
    
    setSalesHistory(prev => [newSale, ...prev]);
  };

  const handleUpdateOrderStatus = (saleId: string, newStatus: OrderStatus) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));
  };

  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...newProductData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = { ...expenseData, id: Date.now().toString(), date: new Date().toISOString() };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const pendingOrdersCount = salesHistory.filter(s => s.status === 'pending').length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
      <nav className="hidden w-20 flex-col items-center border-r border-dark-800 bg-dark-950 py-6 md:flex relative">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
          <UtensilsCrossed size={20} />
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setCurrentView('pos')} className={`flex flex-col items-center gap-1 ${currentView === 'pos' ? 'text-primary' : 'text-gray-500'}`}>
            <Store size={22} />
            <span className="text-[10px] font-medium">Venta</span>
          </button>
          <button onClick={() => setCurrentView('orders')} className={`relative flex flex-col items-center gap-1 ${currentView === 'orders' ? 'text-primary' : 'text-gray-500'}`}>
            <ChefHat size={22} />
            {pendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{pendingOrdersCount}</span>}
            <span className="text-[10px] font-medium">Pedidos</span>
          </button>
          <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center gap-1 ${currentView === 'inventory' ? 'text-primary' : 'text-gray-500'}`}>
            <Box size={22} />
            <span className="text-[10px] font-medium">Stock</span>
          </button>
          <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-gray-500'}`}>
            <BarChart3 size={22} />
            <span className="text-[10px] font-medium">Cierre</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden relative">
        {currentView === 'pos' && (
          <PosView 
            products={products} 
            onCheckout={handleCheckout} 
            exchangeRate={exchangeRate}
            onUpdateExchangeRate={setExchangeRate}
            onRefreshRate={fetchBCVRate}
            isLoadingRate={isLoadingRate}
          />
        )}
        {currentView === 'orders' && <OrdersView orders={salesHistory} onUpdateStatus={handleUpdateOrderStatus} />}
        {currentView === 'inventory' && <InventoryView products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} exchangeRate={exchangeRate} />}
        {currentView === 'stats' && <SalesStatsView sales={salesHistory} expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} exchangeRate={exchangeRate} />}
      </div>

      <nav className="flex items-center justify-between px-6 border-t border-dark-800 bg-dark-950/95 py-3 md:hidden z-30 shadow-lg">
        <button onClick={() => setCurrentView('pos')} className={`flex flex-col items-center gap-1 ${currentView === 'pos' ? 'text-primary' : 'text-zinc-500'}`}>
          <Store size={22} /><span className="text-[10px] font-bold">Venta</span>
        </button>
        <button onClick={() => setCurrentView('orders')} className={`flex flex-col items-center gap-1 relative ${currentView === 'orders' ? 'text-primary' : 'text-zinc-500'}`}>
          <ChefHat size={22} />
          {pendingOrdersCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white border-2 border-dark-950">{pendingOrdersCount}</span>}
          <span className="text-[10px] font-bold">Pedidos</span>
        </button>
        <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center gap-1 ${currentView === 'inventory' ? 'text-primary' : 'text-zinc-500'}`}>
          <Box size={22} /><span className="text-[10px] font-bold">Stock</span>
        </button>
        <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-zinc-500'}`}>
          <BarChart3 size={22} /><span className="text-[10px] font-bold">Cierre</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
