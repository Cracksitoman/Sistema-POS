
import React, { useState, useEffect, useCallback } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3, ChefHat, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { PRODUCTS } from './constants';
import { Product, CartItem, Sale, PaymentMethod, Expense, OrderStatus } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';
import OrdersView from './components/OrdersView';
import { supabase } from './lib/supabase';

type View = 'pos' | 'orders' | 'inventory' | 'stats';

const STORAGE_KEYS = {
  RATE: 'fastpos_exchange_rate',
  PRODUCTS: 'fastpos_products',
  SALES: 'fastpos_sales_',
  EXPENSES: 'fastpos_expenses'
};

const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RATE);
    return saved ? parseFloat(saved) : 45.00;
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Sync with Supabase ---
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch Products
      const { data: dbProducts, error: pError } = await supabase.from('products').select('*');
      if (!pError && dbProducts) setProducts(dbProducts);
      else {
        const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        setProducts(saved ? JSON.parse(saved) : PRODUCTS);
      }

      // 2. Fetch Sales
      const { data: dbSales, error: sError } = await supabase.from('sales').select('*').order('date', { ascending: false });
      if (!sError && dbSales) setSalesHistory(dbSales);
      else {
        const saved = localStorage.getItem(STORAGE_KEYS.SALES);
        setSalesHistory(saved ? JSON.parse(saved) : []);
      }

      // 3. Fetch Expenses
      const { data: dbExpenses, error: eError } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (!eError && dbExpenses) setExpenses(dbExpenses);
      else {
        const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
        setExpenses(saved ? JSON.parse(saved) : []);
      }

      setDbConnected(!pError);
    } catch (err) {
      console.error("Database error:", err);
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fallback persistence to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesHistory)); }, [salesHistory]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RATE, exchangeRate.toString()); }, [exchangeRate]);

  const fetchBCVRate = useCallback(async () => {
    try {
      const response = await fetch(BCV_API_URL);
      const data = await response.json();
      const rate = data?.promedio || data?.price;
      if (rate > 0) setExchangeRate(Number(rate));
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
    }
  }, []);

  useEffect(() => { fetchBCVRate(); }, [fetchBCVRate]);

  // --- Database Actions ---

  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: PaymentMethod, customerName?: string, status: OrderStatus = 'pending') => {
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
    
    // Optimistic Update
    setSalesHistory(prev => [newSale, ...prev]);

    // DB Update
    if (dbConnected) {
      const { error } = await supabase.from('sales').insert([newSale]);
      if (error) console.error("Error saving sale to DB:", error);
    }
  };

  const handleUpdateOrderStatus = async (saleId: string, newStatus: OrderStatus) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));

    if (dbConnected) {
      await supabase.from('sales').update({ status: newStatus }).eq('id', saleId);
    }
  };

  const handleAddProduct = async (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...newProductData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);

    if (dbConnected) {
      await supabase.from('products').insert([newProduct]);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    if (dbConnected) {
      await supabase.from('products').update(updatedProduct).eq('id', updatedProduct.id);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (dbConnected) {
      await supabase.from('products').delete().eq('id', id);
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = { ...expenseData, id: Date.now().toString(), date: new Date().toISOString() };
    setExpenses(prev => [newExpense, ...prev]);
    if (dbConnected) {
      await supabase.from('expenses').insert([newExpense]);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (dbConnected) {
      await supabase.from('expenses').delete().eq('id', id);
    }
  };

  const pendingOrdersCount = salesHistory.filter(s => s.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-dark-950 text-white">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-sm font-bold animate-pulse">Sincronizando con FastPOS Cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <nav className="hidden w-20 flex-col items-center border-r border-dark-800 bg-dark-950 py-6 md:flex relative">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
          <UtensilsCrossed size={20} />
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setCurrentView('pos')} className={`flex flex-col items-center gap-1 ${currentView === 'pos' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            <Store size={22} /><span className="text-[10px] font-medium">Venta</span>
          </button>
          <button onClick={() => setCurrentView('orders')} className={`relative flex flex-col items-center gap-1 ${currentView === 'orders' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            <ChefHat size={22} />
            {pendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{pendingOrdersCount}</span>}
            <span className="text-[10px] font-medium">Pedidos</span>
          </button>
          <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center gap-1 ${currentView === 'inventory' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            <Box size={22} /><span className="text-[10px] font-medium">Stock</span>
          </button>
          <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            <BarChart3 size={22} /><span className="text-[10px] font-medium">Cierre</span>
          </button>
        </div>
        
        {/* Connection Status Icon */}
        <div className="mt-auto flex flex-col items-center gap-4">
           {isSyncing ? (
             <Loader2 className="animate-spin text-gray-500" size={16} />
           ) : dbConnected ? (
             <Cloud className="text-emerald-500" size={16} />
           ) : (
             <CloudOff className="text-red-500" size={16} />
           )}
           <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
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
            isLoadingRate={false}
          />
        )}
        {currentView === 'orders' && <OrdersView orders={salesHistory} onUpdateStatus={handleUpdateOrderStatus} />}
        {currentView === 'inventory' && <InventoryView products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} exchangeRate={exchangeRate} />}
        {currentView === 'stats' && <SalesStatsView sales={salesHistory} expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} exchangeRate={exchangeRate} />}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="flex items-center justify-between px-6 border-t border-dark-800 bg-dark-950/95 py-3 md:hidden z-30 shadow-lg">
        <button onClick={() => setCurrentView('pos')} className={`flex flex-col items-center gap-1 ${currentView === 'pos' ? 'text-primary' : 'text-zinc-500'}`}>
          <Store size={20} /><span className="text-[10px] font-bold">Venta</span>
        </button>
        <button onClick={() => setCurrentView('orders')} className={`flex flex-col items-center gap-1 relative ${currentView === 'orders' ? 'text-primary' : 'text-zinc-500'}`}>
          <ChefHat size={20} />
          {pendingOrdersCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white border-2 border-dark-950">{pendingOrdersCount}</span>}
          <span className="text-[10px] font-bold">Pedidos</span>
        </button>
        <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center gap-1 ${currentView === 'inventory' ? 'text-primary' : 'text-zinc-500'}`}>
          <Box size={20} /><span className="text-[10px] font-bold">Stock</span>
        </button>
        <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-zinc-500'}`}>
          <BarChart3 size={20} /><span className="text-[10px] font-bold">Cierre</span>
        </button>
        <div className="pl-2 border-l border-dark-800">
           {dbConnected ? <Cloud className="text-emerald-500" size={14} /> : <CloudOff className="text-red-500" size={14} />}
        </div>
      </nav>
    </div>
  );
};

export default App;
