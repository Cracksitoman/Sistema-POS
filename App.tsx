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
const STORAGE_KEY_SALES = 'fastpos_sales';
const STORAGE_KEY_EXPENSES = 'fastpos_expenses';
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  
  // --- Exchange Rate State ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    return savedRate ? parseFloat(savedRate) : 45.00;
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // --- Data States (Initialize from LocalStorage or Constants) ---
  
  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  // Sales
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SALES);
    return saved ? JSON.parse(saved) : [];
  });

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });

  // --- Persistence Effects (Auto-save to LocalStorage) ---
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


  // --- Exchange Rate Logic (Fetch Online) ---
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
      // Keep existing rate on error
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Fetch rate on mount once
  useEffect(() => { fetchBCVRate(); }, [fetchBCVRate]);

  const handleUpdateExchangeRate = (newRate: number) => setExchangeRate(newRate);


  // --- Actions (Pure State Updates) ---

  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { 
      ...newProductData, 
      id: Date.now().toString() 
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleCheckout = (items: CartItem[], total: number, paymentMethod: PaymentMethod, customerName?: string) => {
    // Generate simple daily order number
    const today = new Date().toDateString();
    const todaysOrders = salesHistory.filter(s => new Date(s.date).toDateString() === today);
    const orderNumber = todaysOrders.length + 1;

    const newSale: Sale = {
      id: Date.now().toString(),
      orderNumber,
      date: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      exchangeRate,
      status: 'pending',
      customerName: customerName || `Cliente ${orderNumber}`
    };
    setSalesHistory(prev => [newSale, ...prev]);
  };

  const handleUpdateOrderStatus = (saleId: string, newStatus: OrderStatus) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));
  };

  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // --- Navigation Helper ---
  const getNavLinkClass = (view: View) => {
    const isActive = currentView === view;
    return `group flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
      isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
    }`;
  };

  const getIconContainerClass = (view: View) => {
    const isActive = currentView === view;
    return `flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
      isActive ? 'bg-primary/10' : 'bg-transparent group-hover:bg-dark-800'
    }`;
  };

  // Calculate pending orders badge
  const pendingOrdersCount = salesHistory.filter(s => s.status === 'pending').length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
      
      {/* DESKTOP SIDEBAR NAV */}
      <nav className="hidden w-20 flex-col items-center border-r border-dark-800 bg-dark-950 py-6 md:flex relative">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
          <UtensilsCrossed size={20} />
        </div>
        
        <div className="flex flex-col gap-6">
          <button onClick={() => setCurrentView('pos')} className={getNavLinkClass('pos')}>
            <div className={getIconContainerClass('pos')}>
              <Store size={22} />
            </div>
            <span className="text-[10px] font-medium">Venta</span>
          </button>

          <button onClick={() => setCurrentView('orders')} className={getNavLinkClass('orders')}>
            <div className={`relative ${getIconContainerClass('orders')}`}>
              <ChefHat size={22} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Pedidos</span>
          </button>

          <button onClick={() => setCurrentView('inventory')} className={getNavLinkClass('inventory')}>
             <div className={getIconContainerClass('inventory')}>
              <Box size={22} />
            </div>
            <span className="text-[10px] font-medium">Stock</span>
          </button>

          <button onClick={() => setCurrentView('stats')} className={getNavLinkClass('stats')}>
             <div className={getIconContainerClass('stats')}>
              <BarChart3 size={22} />
            </div>
            <span className="text-[10px] font-medium">Cierre</span>
          </button>
        </div>

        {/* Local Indicator */}
        <div className="absolute bottom-6 flex justify-center w-full group">
           <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
           <div className="absolute left-14 bottom-0 hidden group-hover:block bg-dark-800 text-xs px-2 py-1 rounded whitespace-nowrap border border-dark-700">
             Modo Local
           </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'pos' && (
          <PosView 
            products={products} 
            onCheckout={handleCheckout} 
            exchangeRate={exchangeRate}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            onRefreshRate={fetchBCVRate}
            isLoadingRate={isLoadingRate}
          />
        )}
        {currentView === 'orders' && (
          <OrdersView 
            orders={salesHistory}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}
        {currentView === 'inventory' && (
          <InventoryView 
            products={products} 
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            exchangeRate={exchangeRate}
          />
        )}
        {currentView === 'stats' && (
          <SalesStatsView 
            sales={salesHistory} 
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            exchangeRate={exchangeRate}
          />
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="flex items-center justify-around border-t border-dark-800 bg-dark-950 py-3 md:hidden z-30">
        <button 
          onClick={() => setCurrentView('pos')}
          className={`flex flex-col items-center gap-1 ${currentView === 'pos' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Store size={20} strokeWidth={currentView === 'pos' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Venta</span>
        </button>
        <button 
          onClick={() => setCurrentView('orders')}
          className={`flex flex-col items-center gap-1 ${currentView === 'orders' ? 'text-primary' : 'text-gray-500'} relative`}
        >
          <div className="relative">
             <ChefHat size={20} strokeWidth={currentView === 'orders' ? 2.5 : 2} />
             {pendingOrdersCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border border-dark-950">
                  {pendingOrdersCount}
                </span>
              )}
          </div>
          <span className="text-[10px] font-medium">Pedidos</span>
        </button>
        <button 
          onClick={() => setCurrentView('stats')}
          className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-gray-500'}`}
        >
          <BarChart3 size={20} strokeWidth={currentView === 'stats' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Cierre</span>
        </button>
      </nav>
    </div>
  );
};

export default App;