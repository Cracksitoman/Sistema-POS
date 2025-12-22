import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { PRODUCTS } from './constants'; // Fallback data
import { Product, CartItem, Sale, PaymentMethod, Expense } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';

type View = 'pos' | 'inventory' | 'stats';

const STORAGE_KEY_RATE = 'fastpos_exchange_rate';
const STORAGE_KEY_PRODUCTS = 'fastpos_products'; // For offline mode
const STORAGE_KEY_SALES = 'fastpos_sales';
const STORAGE_KEY_EXPENSES = 'fastpos_expenses';
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Check if Supabase is configured
  const isOnline = useMemo(() => {
    const meta = import.meta as any;
    return !!meta?.env?.VITE_SUPABASE_URL && !!meta?.env?.VITE_SUPABASE_ANON_KEY;
  }, []);

  // --- Exchange Rate State ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    return savedRate ? parseFloat(savedRate) : 45.00;
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // --- Data States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --- Helpers for Offline Mode ---
  const loadOfflineData = useCallback(() => {
    // Products
    const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      setProducts(PRODUCTS); // Use default constants
    }

    // Sales
    const savedSales = localStorage.getItem(STORAGE_KEY_SALES);
    if (savedSales) setSalesHistory(JSON.parse(savedSales));

    // Expenses
    const savedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  const saveOfflineData = (key: string, data: any) => {
    if (!isOnline) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // --- Initial Data Load ---
  const fetchAllData = useCallback(async () => {
    if (!isOnline) {
      loadOfflineData();
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      if (productsData) setProducts(productsData);

      // 2. Fetch Sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);

      if (salesError) throw salesError;
      if (salesData) {
        const mappedSales = salesData.map((s: any) => ({
          id: s.id,
          date: s.date,
          items: s.items,
          total: s.total,
          paymentMethod: s.payment_method,
          exchangeRate: s.exchange_rate
        }));
        setSalesHistory(mappedSales);
      }

      // 3. Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);

      if (expensesError) throw expensesError;
      if (expensesData) setExpenses(expensesData);

    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      // Fallback to offline data if fetch fails heavily?
      // For now, we trust Supabase if isOnline is true.
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, loadOfflineData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Watchers for Offline persistence
  useEffect(() => { if (!isOnline) saveOfflineData(STORAGE_KEY_PRODUCTS, products); }, [products, isOnline]);
  useEffect(() => { if (!isOnline) saveOfflineData(STORAGE_KEY_SALES, salesHistory); }, [salesHistory, isOnline]);
  useEffect(() => { if (!isOnline) saveOfflineData(STORAGE_KEY_EXPENSES, expenses); }, [expenses, isOnline]);


  // --- Exchange Rate Logic ---
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
  useEffect(() => { localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString()); }, [exchangeRate]);
  const handleUpdateExchangeRate = (newRate: number) => setExchangeRate(newRate);


  // --- Actions ---

  // SEED DATABASE (Only when online and empty)
  const handleSeedDatabase = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      // Insert default products from constants
      const { data, error } = await supabase
        .from('products')
        .insert(PRODUCTS.map(p => ({
            name: p.name,
            price: p.price,
            category: p.category
        })))
        .select();
      
      if (error) throw error;
      if (data) setProducts(data);
      alert("Base de datos inicializada con productos de prueba.");
    } catch (e) {
      console.error("Error seeding DB:", e);
      alert("Error al inicializar la base de datos.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddProduct = async (newProductData: Omit<Product, 'id'>) => {
    const tempId = Date.now().toString();
    const tempProduct = { ...newProductData, id: tempId };
    setProducts(prev => [...prev, tempProduct]);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            name: newProductData.name,
            price: newProductData.price,
            category: newProductData.category
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProducts(prev => prev.map(p => p.id === tempId ? data : p));
        }
      } catch (err) {
        console.error("Error adding product:", err);
        setProducts(prev => prev.filter(p => p.id !== tempId));
        alert("Error de conexión al guardar.");
      }
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('products')
          .update({
            name: updatedProduct.name,
            price: updatedProduct.price,
            category: updatedProduct.category
          })
          .eq('id', updatedProduct.id);

        if (error) throw error;
      } catch (err) {
        console.error("Error updating product:", err);
        fetchAllData(); // Revert
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const backup = products;
    setProducts(prev => prev.filter(p => p.id !== id));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error("Error deleting product:", err);
        setProducts(backup);
      }
    }
  };

  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: PaymentMethod) => {
    const newSaleTemp: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      exchangeRate
    };

    setSalesHistory(prev => [newSaleTemp, ...prev]);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('sales')
          .insert([{
            items: items,
            total: total,
            payment_method: paymentMethod,
            exchange_rate: exchangeRate,
            date: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
           setSalesHistory(prev => prev.map(s => s.id === newSaleTemp.id ? { ...s, id: data.id, date: data.date } : s));
        }
      } catch (err) {
        console.error("Error recording sale:", err);
        // We keep it in state, but warn user
        // In a real app we'd add it to a sync queue
      }
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const tempExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    
    setExpenses(prev => [tempExpense, ...prev]);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .insert([{
            amount: expenseData.amount,
            description: expenseData.description,
            category: expenseData.category,
            date: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setExpenses(prev => prev.map(e => e.id === tempExpense.id ? data : e));
        }
      } catch (err) {
        console.error("Error adding expense:", err);
        setExpenses(prev => prev.filter(e => e.id !== tempExpense.id));
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const backup = expenses;
    setExpenses(prev => prev.filter(e => e.id !== id));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (err) {
        console.error("Error deleting expense:", err);
        setExpenses(backup);
      }
    }
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

        {/* Sync Indicator */}
        <div className="absolute bottom-6 flex justify-center w-full group">
           <div 
             className={`h-2.5 w-2.5 rounded-full ${!isOnline ? 'bg-gray-500' : isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} 
           />
           {/* Tooltip */}
           <div className="absolute left-14 bottom-0 hidden group-hover:block bg-dark-800 text-xs px-2 py-1 rounded whitespace-nowrap border border-dark-700">
             {!isOnline ? 'Modo Offline (Local)' : isSyncing ? 'Sincronizando...' : 'Conectado a BD'}
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
        {currentView === 'inventory' && (
          <InventoryView 
            products={products} 
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            exchangeRate={exchangeRate}
            onSeedDatabase={isOnline && products.length === 0 ? handleSeedDatabase : undefined}
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