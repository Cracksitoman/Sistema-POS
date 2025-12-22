import React, { useState, useEffect, useCallback } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { PRODUCTS } from './constants';
import { Product, CartItem, Sale, PaymentMethod, Expense } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';

type View = 'pos' | 'inventory' | 'stats';

const STORAGE_KEY_PRODUCTS = 'fastpos_products';
const STORAGE_KEY_SALES = 'fastpos_sales';
const STORAGE_KEY_EXPENSES = 'fastpos_expenses';
const STORAGE_KEY_RATE = 'fastpos_exchange_rate';

// API Endpoint for BCV rate
// Using ve.dolarapi.com as it's stable, free, and CORS-friendly
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  
  // --- Exchange Rate State ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    return savedRate ? parseFloat(savedRate) : 45.00; // Default fallback
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Fetch Rate Function
  const fetchBCVRate = useCallback(async () => {
    setIsLoadingRate(true);
    try {
      const response = await fetch(BCV_API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // Parse logic for DolarAPI (returns 'promedio' or 'price')
      let rate = 0;
      
      if (data?.promedio) {
        rate = Number(data.promedio);
      } else if (data?.price) {
        rate = Number(data.price);
      }

      if (rate > 0) {
        setExchangeRate(rate);
      } else {
        console.warn('Could not parse rate from API, using current local rate');
      }
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
      // We do not reset the rate to 0 on error, we keep the last known good rate
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetchBCVRate();
  }, [fetchBCVRate]);

  // Save Rate persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString());
  }, [exchangeRate]);

  // Manual Update handler
  const handleUpdateExchangeRate = (newRate: number) => {
    setExchangeRate(newRate);
  };


  // --- Products State (Load/Save) ---
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (savedProducts) {
        return JSON.parse(savedProducts);
      }
    } catch (error) {
      console.error('Error loading products from localStorage:', error);
    }
    return PRODUCTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (error) {
      console.error('Error saving products to localStorage:', error);
    }
  }, [products]);

  // --- Sales History State (Load/Save) ---
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    try {
      const savedSales = localStorage.getItem(STORAGE_KEY_SALES);
      if (savedSales) {
        return JSON.parse(savedSales);
      }
    } catch (error) {
      console.error('Error loading sales from localStorage:', error);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(salesHistory));
    } catch (error) {
      console.error('Error saving sales to localStorage:', error);
    }
  }, [salesHistory]);

  // --- Expenses State (Load/Save) ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const savedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (savedExpenses) {
        return JSON.parse(savedExpenses);
      }
    } catch (error) {
      console.error('Error loading expenses from localStorage:', error);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses to localStorage:', error);
    }
  }, [expenses]);


  // --- Inventory Actions ---
  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: Date.now().toString(),
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) => 
      prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p)
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // --- POS Actions ---
  const handleCheckout = (items: CartItem[], total: number, paymentMethod: PaymentMethod) => {
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: items,
      total: total,
      paymentMethod: paymentMethod,
      exchangeRate: exchangeRate
    };
    setSalesHistory((prev) => [...prev, newSale]);
  };

  // --- Expense Actions ---
  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setExpenses((prev) => [...prev, newExpense]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter(e => e.id !== id));
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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
      
      {/* DESKTOP SIDEBAR NAV */}
      <nav className="hidden w-20 flex-col items-center border-r border-dark-800 bg-dark-950 py-6 md:flex">
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
            <span className="text-[10px] font-medium">Stats</span>
          </button>
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
          onClick={() => setCurrentView('inventory')}
          className={`flex flex-col items-center gap-1 ${currentView === 'inventory' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Box size={20} strokeWidth={currentView === 'inventory' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Stock</span>
        </button>
        <button 
          onClick={() => setCurrentView('stats')}
          className={`flex flex-col items-center gap-1 ${currentView === 'stats' ? 'text-primary' : 'text-gray-500'}`}
        >
          <BarChart3 size={20} strokeWidth={currentView === 'stats' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Stats</span>
        </button>
      </nav>
    </div>
  );
};

export default App;