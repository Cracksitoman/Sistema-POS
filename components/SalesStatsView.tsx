
import React, { useMemo, useState } from 'react';
import { Sale, PaymentMethod, Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatVES } from '../utils/currency';
import { TrendingUp, TrendingDown, Clock, CreditCard, Banknote, Smartphone, Filter, XCircle, Plus, Receipt, AlertTriangle, Trash2, X, DollarSign, ArrowRightLeft, Wallet } from 'lucide-react';

interface SalesStatsViewProps {
  sales: Sale[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  onDeleteExpense: (id: string) => void;
  exchangeRate: number;
}

type Tab = 'sales' | 'expenses';

const SalesStatsView: React.FC<SalesStatsViewProps> = ({ sales, expenses, onAddExpense, onDeleteExpense, exchangeRate }) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amountUSD: '', amountVES: '', description: '', category: 'expense' as ExpenseCategory });

  // Filtrado robusto basado en strings YYYY-MM-DD para evitar errores de zona horaria
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDay = s.date.split('T')[0];
      if (startDate && saleDay < startDate) return false;
      if (endDate && saleDay > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expDay = e.date.split('T')[0];
      if (startDate && expDay < startDate) return false;
      if (endDate && expDay > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
  }, [filteredSales, filteredExpenses]);

  const cashCut = useMemo(() => {
    let usdCash = 0, usdZelle = 0, vesMobile = 0, vesCard = 0;
    filteredSales.forEach(sale => {
      if (sale.paymentMethod === 'cash') usdCash += sale.total;
      else if (sale.paymentMethod === 'zelle') usdZelle += sale.total;
      else if (sale.paymentMethod === 'mobile') vesMobile += (sale.total * sale.exchangeRate);
      else if (sale.paymentMethod === 'card') vesCard += (sale.total * sale.exchangeRate);
    });
    return { usdCash, usdZelle, vesMobile, vesCard };
  }, [filteredSales]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amountUSD);
    if (!amount || !expenseForm.description) return;
    onAddExpense({ amount, description: expenseForm.description, category: expenseForm.category });
    setIsExpenseModalOpen(false);
    setExpenseForm({ amountUSD: '', amountVES: '', description: '', category: 'expense' });
  };

  return (
    <div className="flex h-full w-full flex-col bg-dark-950">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-800 bg-dark-950 px-4 py-3 md:px-6 md:py-5 gap-4">
        <div><h1 className="text-lg font-bold text-white">Cierre de Caja</h1><p className="text-[10px] text-gray-500 uppercase font-semibold">Resumen Diario</p></div>
        <div className="flex items-center gap-2 bg-dark-900 p-1.5 rounded-xl border border-dark-800">
          <Filter size={14} className="text-gray-500 ml-2" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-xs text-white outline-none" /><span className="text-gray-600">-</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-xs text-white outline-none" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="bg-dark-900 border border-dark-800 p-4 rounded-xl"><span className="text-[10px] text-gray-500 uppercase font-bold">Efectivo USD</span><p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(cashCut.usdCash)}</p></div>
          <div className="bg-dark-900 border border-dark-800 p-4 rounded-xl"><span className="text-[10px] text-gray-500 uppercase font-bold">Zelle USD</span><p className="text-xl font-black text-blue-400 mt-1">{formatCurrency(cashCut.usdZelle)}</p></div>
          <div className="bg-dark-900 border border-dark-800 p-4 rounded-xl"><span className="text-[10px] text-gray-500 uppercase font-bold">P. Móvil BS</span><p className="text-xl font-black text-yellow-500 mt-1">{formatVES(cashCut.vesMobile)}</p></div>
          <div className="bg-dark-900 border border-dark-800 p-4 rounded-xl"><span className="text-[10px] text-gray-500 uppercase font-bold">Punto BS</span><p className="text-xl font-black text-purple-500 mt-1">{formatVES(cashCut.vesCard)}</p></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-900 border border-dark-800 p-5 rounded-2xl"><TrendingUp className="text-emerald-500 mb-2" size={24} /><span className="text-xs text-gray-500">Ingresos Totales</span><p className="text-2xl font-black text-white">{formatCurrency(stats.totalRevenue)}</p></div>
          <div className="bg-dark-900 border border-dark-800 p-5 rounded-2xl"><TrendingDown className="text-red-500 mb-2" size={24} /><span className="text-xs text-gray-500">Gastos</span><p className="text-2xl font-black text-white">{formatCurrency(stats.totalExpenses)}</p></div>
          <div className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/10"><Wallet className="text-white mb-2" size={24} /><span className="text-xs text-white/70">Ganancia Neta</span><p className="text-2xl font-black text-white">{formatCurrency(stats.netProfit)}</p></div>
        </div>

        <div className="flex border-b border-dark-800 mb-4 gap-4">
          <button onClick={() => setActiveTab('sales')} className={`pb-2 text-sm font-bold ${activeTab === 'sales' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Ventas ({filteredSales.length})</button>
          <button onClick={() => setActiveTab('expenses')} className={`pb-2 text-sm font-bold ${activeTab === 'expenses' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Gastos ({filteredExpenses.length})</button>
          {activeTab === 'expenses' && <button onClick={() => setIsExpenseModalOpen(true)} className="ml-auto flex items-center gap-1 bg-red-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold"><Plus size={12} /> Registrar Salida</button>}
        </div>

        <div className="space-y-3">
          {activeTab === 'sales' ? (
            filteredSales.length === 0 ? <p className="text-center text-gray-600 py-10">No hay ventas registradas en este periodo.</p> :
            filteredSales.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-dark-900 border border-dark-800 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-dark-800 p-2 rounded-lg text-center min-w-[50px]"><span className="text-[8px] text-gray-500 font-bold block">ORD</span><span className="text-xs font-bold text-white">#{s.orderNumber}</span></div>
                  <div><p className="text-sm font-bold text-white">{s.customerName}</p><p className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {new Date(s.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                </div>
                <div className="text-right"><p className="text-lg font-bold text-white">{formatCurrency(s.total)}</p><span className="text-[8px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{s.paymentMethod}</span></div>
              </div>
            ))
          ) : (
            filteredExpenses.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-dark-900 border border-dark-800 p-4 rounded-xl">
                <div className="flex items-center gap-3"><div className="bg-red-500/10 p-2 rounded-lg text-red-500"><Receipt size={18} /></div><div><p className="text-sm font-bold text-white">{e.description}</p><p className="text-[10px] text-gray-500 uppercase">{e.category}</p></div></div>
                <div className="flex items-center gap-4"><p className="text-lg font-bold text-red-500">-{formatCurrency(e.amount)}</p><button onClick={() => onDeleteExpense(e.id)} className="p-2 text-gray-600 hover:text-red-500"><Trash2 size={16} /></button></div>
              </div>
            ))
          )}
        </div>
      </div>

      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in zoom-in duration-200">
          <form onSubmit={handleExpenseSubmit} className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Nuevo Gasto</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" required placeholder="Monto $" className="bg-dark-950 border border-dark-800 rounded-xl p-3 text-white outline-none focus:border-red-500" value={expenseForm.amountUSD} onChange={(e) => setExpenseForm({...expenseForm, amountUSD: e.target.value, amountVES: (parseFloat(e.target.value) * exchangeRate).toFixed(2)})} />
              <input type="text" placeholder="Concepto" className="bg-dark-950 border border-dark-800 rounded-xl p-3 text-white outline-none focus:border-red-500" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setExpenseForm({...expenseForm, category: 'expense'})} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${expenseForm.category === 'expense' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-dark-950 border-dark-800 text-gray-500'}`}>Gasto</button>
              <button type="button" onClick={() => setExpenseForm({...expenseForm, category: 'loss'})} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${expenseForm.category === 'loss' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-dark-950 border-dark-800 text-gray-500'}`}>Pérdida</button>
            </div>
            <div className="flex gap-2 pt-2"><button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 rounded-xl bg-dark-800 py-3 text-xs font-bold">Cancelar</button><button type="submit" className="flex-[2] rounded-xl bg-red-600 py-3 text-xs font-bold">Guardar Salida</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
export default SalesStatsView;
