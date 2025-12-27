
import React, { useMemo, useState } from 'react';
import { Sale, PaymentMethod, Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatVES } from '../utils/currency';
import { TrendingUp, TrendingDown, Calendar, Clock, CreditCard, Banknote, Smartphone, Filter, XCircle, Plus, Receipt, AlertTriangle, Trash2, X, DollarSign, ArrowRightLeft, Wallet } from 'lucide-react';

interface SalesStatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  onDeleteExpense: (id: string) => void;
  exchangeRate: number;
}

type Tab = 'sales' | 'expenses';

const SalesStatsView: React.FC<SalesStatsViewProps> = ({ sales, expenses, onAddExpense, onDeleteExpense, exchangeRate }) => {
  // Date Filter State
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  
  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amountUSD: '',
    amountVES: '',
    description: '',
    category: 'expense' as ExpenseCategory
  });

  // --- Filtering Logic ---
  const isWithinRange = (dateString: string) => {
    if (!startDate && !endDate) return true;
    const itemDate = new Date(dateString);
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  };

  const filteredSales = useMemo(() => sales.filter(s => isWithinRange(s.date)), [sales, startDate, endDate]);
  const filteredExpenses = useMemo(() => expenses.filter(e => isWithinRange(e.date)), [expenses, startDate, endDate]);

  // --- Financial Calculations ---
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    return { totalRevenue, totalExpenses, netProfit };
  }, [filteredSales, filteredExpenses]);

  // --- Cierre de Caja (Cash Cut) Logic ---
  const cashCut = useMemo(() => {
    let usdCash = 0;
    let usdZelle = 0;
    let vesMobile = 0;
    let vesCard = 0;

    filteredSales.forEach(sale => {
      if (sale.paymentMethod === 'cash') usdCash += sale.total;
      if (sale.paymentMethod === 'zelle') usdZelle += sale.total;
      
      // For VES payments, we should technically use the rate at time of sale for historical accuracy, 
      // or current rate if we are just reconciling counts. 
      // Let's use the stored rate on the sale to know exactly how many VES were charged at that moment.
      if (sale.paymentMethod === 'mobile') vesMobile += (sale.total * sale.exchangeRate);
      if (sale.paymentMethod === 'card') vesCard += (sale.total * sale.exchangeRate);
    });

    // Subtract Cash Expenses from Cash USD (Assuming expenses are paid in Cash usually, 
    // or we could add a payment method to expenses, but keeping it simple for now).
    // Let's just show total sales per method for reconciliation.
    
    return { usdCash, usdZelle, vesMobile, vesCard };
  }, [filteredSales]);


  // --- Sorters ---
  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Handlers ---
  const handleUSDChange = (val: string) => {
    setExpenseForm(prev => {
      const numVal = parseFloat(val);
      const newVES = !isNaN(numVal) ? (numVal * exchangeRate).toFixed(2) : '';
      return { ...prev, amountUSD: val, amountVES: newVES };
    });
  };

  const handleVESChange = (val: string) => {
    setExpenseForm(prev => {
      const numVal = parseFloat(val);
      const newUSD = !isNaN(numVal) && exchangeRate > 0 ? (numVal / exchangeRate).toFixed(2) : '';
      return { ...prev, amountVES: val, amountUSD: newUSD };
    });
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amountUSD);
    if (!amount || !expenseForm.description) return;

    onAddExpense({
      amount,
      description: expenseForm.description,
      category: expenseForm.category
    });
    
    setIsExpenseModalOpen(false);
    setExpenseForm({ amountUSD: '', amountVES: '', description: '', category: 'expense' });
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card': return <CreditCard size={14} />;
      case 'mobile': return <Smartphone size={14} />;
      case 'zelle': return <DollarSign size={14} />;
      case 'cash': default: return <Banknote size={14} />;
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-dark-950 relative">
      
      {/* Header with Filters */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-800 bg-dark-950/95 px-4 py-3 md:px-6 md:py-5 gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">Finanzas & Cierre</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Balance y Arqueo</p>
        </div>

        <div className="flex items-center gap-2 bg-dark-900 p-1.5 rounded-xl border border-dark-800 overflow-x-auto">
          <div className="flex items-center gap-2 px-2 text-gray-400">
            <Filter size={14} />
            <span className="text-xs font-medium">Filtrar:</span>
          </div>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-dark-950 border border-dark-800 rounded-lg text-xs text-white px-2 py-1.5 focus:border-primary focus:outline-none [color-scheme:dark]"
          />
          <span className="text-gray-500 text-xs">-</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-dark-950 border border-dark-800 rounded-lg text-xs text-white px-2 py-1.5 focus:border-primary focus:outline-none [color-scheme:dark]"
          />
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="p-1 hover:text-red-400 text-gray-500 transition-colors"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
        
        {/* CASH CUT SUMMARY (ARQUEO DE CAJA) */}
        <div className="mb-8">
           <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
             <Wallet size={16} className="text-primary"/> Resumen por Método de Pago
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <span className="text-xs text-gray-500 block mb-1">Efectivo (USD)</span>
                 <span className="text-xl font-bold text-green-400">{formatCurrency(cashCut.usdCash)}</span>
              </div>
              <div className="bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <span className="text-xs text-gray-500 block mb-1">Zelle (USD)</span>
                 <span className="text-xl font-bold text-blue-400">{formatCurrency(cashCut.usdZelle)}</span>
              </div>
              <div className="bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <span className="text-xs text-gray-500 block mb-1">Pago Móvil (VES)</span>
                 <span className="text-xl font-bold text-yellow-400">{formatVES(cashCut.vesMobile)}</span>
              </div>
              <div className="bg-dark-900 border border-dark-800 p-3 rounded-xl">
                 <span className="text-xs text-gray-500 block mb-1">Punto de Venta (VES)</span>
                 <span className="text-xl font-bold text-purple-400">{formatVES(cashCut.vesCard)}</span>
              </div>
           </div>
        </div>

        {/* Global Stats */}
        <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
           <TrendingUp size={16} className="text-primary"/> Totales Generales
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          {/* Income */}
          <div className="rounded-xl bg-dark-900 border border-dark-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={48} className="text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Ventas Totales</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
          </div>

          {/* Expenses */}
          <div className="rounded-xl bg-dark-900 border border-dark-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown size={48} className="text-red-500" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Gastos / Pérdidas</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(stats.totalExpenses)}</p>
          </div>

          {/* Net Profit */}
          <div className="rounded-xl bg-primary p-5 shadow-lg relative overflow-hidden">
             <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 border border-white/20 px-2 py-0.5 rounded">Ganancia Neta</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(stats.netProfit)}</p>
            </div>
          </div>
        </div>

        {/* Tabs & Actions */}
        <div className="flex items-center justify-between mb-4 border-b border-dark-800 pb-1">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('sales')}
              className={`pb-2 text-sm font-bold transition-all ${activeTab === 'sales' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Historial Ventas
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={`pb-2 text-sm font-bold transition-all ${activeTab === 'expenses' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Historial Gastos
            </button>
          </div>

          {activeTab === 'expenses' && (
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-red-900/20"
            >
              <Plus size={14} /> Registrar Gasto
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="space-y-3 pb-8">
          
          {/* SALES LIST */}
          {activeTab === 'sales' && (
            sortedSales.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-dark-800 text-gray-500">
                <p>No hay ventas registradas.</p>
              </div>
            ) : (
              sortedSales.map((sale) => {
                const dateObj = new Date(sale.date);
                return (
                  <div key={sale.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-dark-900 border border-dark-800 p-4 hover:border-dark-700 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center rounded-lg bg-dark-800 p-2 w-12 h-12">
                          <span className="text-[10px] font-bold uppercase text-gray-400">#{sale.orderNumber}</span>
                          <span className="text-xs font-bold text-white leading-none text-center">Ord</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-white mb-0.5">
                             {sale.customerName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <Clock size={12} /> {dateObj.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sale.items.map((i, idx) => (
                              <span key={idx} className="text-xs text-gray-300 bg-dark-800 px-1.5 rounded border border-dark-700">
                                {i.quantity}x {i.name}
                              </span>
                            ))}
                          </div>
                        </div>
                     </div>
                     <div className="flex items-center justify-between md:justify-end gap-4 border-t border-dark-800 pt-2 md:pt-0 md:border-t-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded">
                          {getPaymentIcon(sale.paymentMethod)} {sale.paymentMethod}
                        </div>
                        <span className="text-lg font-bold text-white">{formatCurrency(sale.total)}</span>
                     </div>
                  </div>
                );
              })
            )
          )}

          {/* EXPENSES LIST */}
          {activeTab === 'expenses' && (
             sortedExpenses.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-dark-800 text-gray-500">
                <p>No hay gastos registrados.</p>
              </div>
            ) : (
              sortedExpenses.map((expense) => {
                const dateObj = new Date(expense.date);
                const isLoss = expense.category === 'loss';
                return (
                  <div key={expense.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-dark-900 border border-dark-800 p-4 hover:border-dark-700 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center rounded-lg w-12 h-12 ${isLoss ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                         {isLoss ? <AlertTriangle size={20} /> : <Receipt size={20} />}
                      </div>
                      <div>
                         <p className="text-sm font-bold text-white">{expense.description}</p>
                         <p className="text-xs text-gray-500 mt-0.5">
                           {dateObj.toLocaleDateString('es-ES')} • {dateObj.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t border-dark-800 pt-2 md:pt-0 md:border-t-0">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${isLoss ? 'bg-red-900/30 text-red-400' : 'bg-dark-800 text-gray-400'}`}>
                        {isLoss ? 'Pérdida' : 'Gasto'}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-white">- {formatCurrency(expense.amount)}</span>
                        <button 
                          onClick={() => onDeleteExpense(expense.id)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-dark-800 rounded-lg transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-dark-800 p-4">
              <h3 className="text-lg font-bold text-white">Registrar Salida</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Monto del Gasto</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-bold">$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      autoFocus
                      className="w-full bg-dark-950 border border-dark-800 rounded-xl py-2 pl-7 pr-3 text-white focus:border-red-500 focus:outline-none"
                      placeholder="USD"
                      value={expenseForm.amountUSD}
                      onChange={(e) => handleUSDChange(e.target.value)}
                    />
                  </div>
                  <div className="text-gray-600">
                    <ArrowRightLeft size={16} />
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-bold">Bs</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-dark-950 border border-dark-800 rounded-xl py-2 pl-8 pr-3 text-white focus:border-red-500 focus:outline-none"
                      placeholder="VES"
                      value={expenseForm.amountVES}
                      onChange={(e) => handleVESChange(e.target.value)}
                    />
                  </div>
                </div>
                 <p className="text-[10px] text-gray-500 text-center mt-1">
                    Tasa actual: {exchangeRate.toFixed(2)} Bs/$
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Descripción / Nota</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl py-2 px-3 text-white focus:border-red-500 focus:outline-none"
                  placeholder="Ej. Compra de Pan, Pago de hielo..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Salida</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setExpenseForm({...expenseForm, category: 'expense'})}
                    className={`py-2 rounded-xl text-sm font-bold border ${expenseForm.category === 'expense' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-dark-950 border-dark-800 text-gray-500 hover:border-gray-600'}`}
                  >
                    Gasto Operativo
                  </button>
                  <button 
                    type="button"
                    onClick={() => setExpenseForm({...expenseForm, category: 'loss'})}
                    className={`py-2 rounded-xl text-sm font-bold border ${expenseForm.category === 'loss' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-dark-950 border-dark-800 text-gray-500 hover:border-gray-600'}`}
                  >
                    Pérdida / Merma
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98]">
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesStatsView;
