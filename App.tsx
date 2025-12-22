import React, { useState, useEffect, useCallback } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Product, CartItem, Sale, PaymentMethod, Expense } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';

type View = 'pos' | 'inventory' | 'stats';

const STORAGE_KEY_RATE = 'fastpos_exchange_rate';
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('pos');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- Exchange Rate State (Keep in LocalStorage for speed/offline mostly) ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    return savedRate ? parseFloat(savedRate) : 45.00;
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // --- Data States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --- Initial Data Load from Supabase ---
  const fetchAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      if (productsData) setProducts(productsData);

      // 2. Fetch Sales (Last 100 for performance, or filter by date needed)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);

      if (salesError) throw salesError;
      if (salesData) {
        // Map database columns to our TS interface if needed (snake_case to camelCase is automatic often but let's be safe)
        const mappedSales = salesData.map((s: any) => ({
          id: s.id,
          date: s.date,
          items: s.items, // JSONB column
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
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Check if credentials exist before trying to fetch
    const meta = import.meta as any;
    const url = meta?.env?.VITE_SUPABASE_URL;
    
    if (url) {
      fetchAllData();
    } else {
      console.warn("Supabase credentials missing. App running in offline mode (empty data).");
    }
  }, [fetchAllData]);


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


  // --- Inventory Actions (Supabase) ---
  const handleAddProduct = async (newProductData: Omit<Product, 'id'>) => {
    // Optimistic Update
    const tempId = Date.now().toString();
    const tempProduct = { ...newProductData, id: tempId };
    setProducts(prev => [...prev, tempProduct]);

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
      
      // Replace temp product with real DB product
      if (data) {
        setProducts(prev => prev.map(p => p.id === tempId ? data : p));
      }
    } catch (err) {
      console.error("Error adding product:", err);
      // Rollback on error
      setProducts(prev => prev.filter(p => p.id !== tempId));
      alert("Error al guardar en la base de datos.");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    // Optimistic
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

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
      fetchAllData(); // Revert to server state
    }
  };

  const handleDeleteProduct = async (id: string) => {
    // Optimistic
    const backup = products;
    setProducts(prev => prev.filter(p => p.id !== id));

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
  };

  // --- POS Actions (Supabase) ---
  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: PaymentMethod) => {
    const newSaleTemp: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      exchangeRate
    };

    // Optimistic
    setSalesHistory(prev => [newSaleTemp, ...prev]);

    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([{
          items: items, // Sending the JSON array directly
          total: total,
          payment_method: paymentMethod,
          exchange_rate: exchangeRate,
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update the temporary ID with the real one from DB
         setSalesHistory(prev => prev.map(s => s.id === newSaleTemp.id ? {
           ...s, 
           id: data.id, 
           date: data.date 
         } : s));
      }
    } catch (err) {
      console.error("Error recording sale:", err);
      alert("Hubo un error guardando la venta. Verifique conexión.");
    }
  };

  // --- Expense Actions (Supabase) ---
  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const tempExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    
    setExpenses(prev => [tempExpense, ...prev]);

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
  };

  const handleDeleteExpense = async (id: string) => {
    const backup = expenses;
    setExpenses(prev => prev.filter(e => e.id !== id));

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
        <div className="absolute bottom-6 flex justify-center w-full">
           <div title={isSyncing ? "Sincronizando..." : "Conectado"} className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
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