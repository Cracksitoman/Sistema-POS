
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Store, Box, UtensilsCrossed, BarChart3, ChefHat, Upload, Play, RotateCcw, FileJson } from 'lucide-react';
import { PRODUCTS } from './constants';
import { Product, CartItem, Sale, PaymentMethod, Expense, OrderStatus } from './types';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import SalesStatsView from './components/SalesStatsView';
import OrdersView from './components/OrdersView';
import { LocalDB, BackupData } from './lib/db';

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
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  
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

  // Check if we have local data to offer "Continue" option
  const hasLocalData = salesHistory.length > 0 || expenses.length > 0 || products.length > PRODUCTS.length;

  const startFileInputRef = useRef<HTMLInputElement>(null);

  // Marcar como inicializado para empezar a guardar cambios
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // --- Persistence to localStorage ---
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

  // --- Tasa BCV ---
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

  // --- Actions ---

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
  };

  const handleUpdateOrderStatus = async (saleId: string, newStatus: OrderStatus) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));
  };

  const handleAddProduct = async (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...newProductData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = { ...expenseData, id: Date.now().toString(), date: new Date().toISOString() };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // --- Backup Functions ---
  const handleExportData = () => {
    LocalDB.exportData(products, salesHistory, expenses, exchangeRate);
  };

  const handleImportData = async (file: File) => {
    try {
      const data: BackupData = await LocalDB.importData(file);
      // Validar si es desde el modal inicial o desde configuración
      const confirmMsg = showStartScreen 
        ? `¿Cargar respaldo del ${new Date(data.timestamp).toLocaleString()}?`
        : `¿Estás seguro de restaurar este respaldo?\n\nFecha: ${new Date(data.timestamp).toLocaleString()}\nSe reemplazarán los datos actuales.`;

      if(window.confirm(confirmMsg)) {
        setProducts(data.products || []);
        setSalesHistory(data.sales || []);
        setExpenses(data.expenses || []);
        setExchangeRate(data.exchangeRate || 45);
        if (showStartScreen) setShowStartScreen(false);
        else alert('Datos restaurados exitosamente.');
      }
    } catch (e) {
      alert('Error al leer el archivo. Asegúrate de que sea un respaldo válido de FastPOS.');
      console.error(e);
    }
  };

  const handleStartFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportData(file);
    if (startFileInputRef.current) startFileInputRef.current.value = '';
  };

  const handleStartFresh = () => {
    if(window.confirm("¿Estás seguro? Se borrará todo el historial actual para empezar de cero.")) {
        setSalesHistory([]);
        setExpenses([]);
        // Mantener productos y tasa, solo borrar historial
        setShowStartScreen(false);
    }
  };

  const pendingOrdersCount = salesHistory.filter(s => s.status === 'pending').length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-dark-950 text-zinc-100 md:flex-row">
      
      {/* --- START SCREEN OVERLAY --- */}
      {showStartScreen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-md space-y-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-primary/20 p-6 rounded-full ring-4 ring-primary/10">
                   <UtensilsCrossed size={64} className="text-primary" />
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">FastPOS</h1>
                <p className="text-gray-400">Sistema de Punto de Venta Local</p>
              </div>

              <div className="space-y-3 pt-4">
                 <button 
                   onClick={() => startFileInputRef.current?.click()}
                   className="w-full group relative flex items-center justify-center gap-3 bg-primary hover:bg-secondary text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                 >
                    <div className="bg-white/20 p-1.5 rounded-lg"><Upload size={20} /></div>
                    <div className="flex flex-col items-start">
                        <span className="text-base leading-none">Cargar Respaldo</span>
                        <span className="text-[10px] text-white/80 font-medium mt-1">Restaurar archivo .json</span>
                    </div>
                 </button>
                 <input 
                    type="file" 
                    ref={startFileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleStartFileChange}
                  />

                 {hasLocalData && (
                   <button 
                     onClick={() => setShowStartScreen(false)}
                     className="w-full flex items-center justify-center gap-3 bg-dark-800 hover:bg-dark-700 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-dark-700"
                   >
                      <div className="text-emerald-500"><Play size={24} /></div>
                      <span className="text-base">Continuar Sesión Anterior</span>
                   </button>
                 )}

                 <button 
                   onClick={handleStartFresh}
                   className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-400 font-medium py-2 px-4 text-sm transition-colors mt-4"
                 >
                    <RotateCcw size={14} />
                    Empezar turno de cero (Borrar historial)
                 </button>
              </div>
              
              <p className="text-[10px] text-gray-600 pt-8">
                 v1.0.0 • Los datos se guardan localmente en este dispositivo.
              </p>
           </div>
        </div>
      )}

      {/* --- MAIN APP UI --- */}
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
        
        <div className="mt-auto mb-4 flex flex-col items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
           <span className="text-[8px] text-gray-500 font-medium">Local</span>
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
        {currentView === 'stats' && (
          <SalesStatsView 
            sales={salesHistory} 
            expenses={expenses} 
            onAddExpense={handleAddExpense} 
            onDeleteExpense={handleDeleteExpense} 
            exchangeRate={exchangeRate}
            onExport={handleExportData}
            onImport={handleImportData}
          />
        )}
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
        <div className="pl-2 border-l border-dark-800 flex flex-col items-center">
           <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
        </div>
      </nav>
    </div>
  );
};

export default App;
