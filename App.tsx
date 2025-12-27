
import React, { useState, useEffect, useCallback } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3, ChefHat, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { PRODUCTS } from './constants';
import { Product, CartItem, Sale, PaymentMethod, Expense, OrderStatus } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';
import OrdersView from './components/OrdersView';
import { db } from './lib/db'; // Usamos nuestro nuevo conector a Neon

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
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Initialize state directly from localStorage
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RATE);
    return saved ? parseFloat(saved) : 45.00;
  });
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });

  // --- Sync with Neon via Netlify Functions ---
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Intentar inicializar la DB (Crear tablas si es la primera vez)
      await db.init();

      // 2. Obtener datos
      const data = await db.getAll();
      
      if (data) {
        if (data.products && data.products.length > 0) setProducts(data.products);
        if (data.sales) setSalesHistory(data.sales);
        if (data.expenses) setExpenses(data.expenses);
        setDbConnected(true);
      }
    } catch (err) {
      console.warn("Modo Offline: No se pudo conectar a la base de datos Neon.", err);
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fallback persistence to localStorage
  useEffect(() => { 
    if(isInitialized) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); 
  }, [products, isInitialized]);

  useEffect(() => { 
    if(isInitialized) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesHistory)); 
  }, [salesHistory, isInitialized]);

  useEffect(() => { 
    if(isInitialized) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); 
  }, [expenses, isInitialized]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.RATE, exchangeRate.toString()); 
  }, [exchangeRate]);

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

  // --- Database Actions (Modified to use db.ts) ---

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
    
    setSalesHistory(prev => [newSale, ...prev]);

    if (dbConnected) {
      db.saveSale(newSale).catch(err => console.error("Error saving to Neon:", err));
    }
  };

  const handleUpdateOrderStatus = async (saleId: string, newStatus: OrderStatus) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));

    if (dbConnected) {
      db.updateSaleStatus(saleId, newStatus).catch(err => console.error("Error updating status:", err));
    }
  };

  const handleAddProduct = async (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...newProductData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);

    if (dbConnected) {
      db.addProduct(newProduct).catch(err => console.error("Error adding product:", err));
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    if (dbConnected) {
      db.updateProduct(updatedProduct).catch(err => console.error("Error updating product:", err));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (dbConnected) {
      db.deleteProduct(id).catch(err => console.error("Error deleting product:", err));
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = { ...expenseData, id: Date.now().toString(), date: new Date().toISOString() };
    setExpenses(prev => [newExpense, ...prev]);
    if (dbConnected) {
      db.addExpense(newExpense).catch(err => console.error("Error adding expense:", err));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (dbConnected) {
      db.deleteExpense(id).catch(err => console.error("Error deleting expense:", err));
    }
  };

  const pendingOrdersCount = salesHistory.filter(s => s.status === 'pending').length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
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
        
        <div className="mt-auto flex flex-col items-center gap-4 group relative">
           {isSyncing ? (
             <Loader2 className="animate-spin text-gray-500" size={16} />
           ) : dbConnected ? (
             <Cloud className="text-emerald-500" size={16} />
           ) : (
             <CloudOff className="text-red-500 cursor-pointer" size={16} />
           )}
           {!dbConnected && !isSyncing && (
             <div className="absolute left-14 bottom-0 w-48 bg-dark-800 border border-dark-700 p-2 rounded text-[10px] text-gray-300 hidden group-hover:block z-50">
               Sin conexión a Neon DB. Instala @neondatabase/serverless y configura DATABASE_URL.
             </div>
           )}
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
