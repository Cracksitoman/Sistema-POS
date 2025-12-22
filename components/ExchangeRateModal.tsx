import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Save, DollarSign, AlertCircle } from 'lucide-react';
import { formatVES } from '../utils/currency';

interface ExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  onUpdate: (rate: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({
  isOpen,
  onClose,
  currentRate,
  onUpdate,
  onRefresh,
  isLoading
}) => {
  const [manualRate, setManualRate] = useState('');

  // Reset manual rate input when modal opens or rate changes
  useEffect(() => {
    if (isOpen) {
      setManualRate(currentRate.toString());
    }
  }, [isOpen, currentRate]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualRate);
    if (!isNaN(val) && val > 0) {
      onUpdate(val);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 bg-dark-950 p-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="text-primary" size={20} />
            Configurar Tasa
          </h3>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Current Rate Display & Refresh */}
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-dark-800/50 border border-dark-800">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Tasa Actual (BCV)</span>
            <div className="text-3xl font-bold text-white tracking-tight">
              {formatVES(currentRate)}
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="mt-2 flex items-center gap-2 text-xs font-bold text-primary hover:text-secondary disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Actualizando...' : 'Refrescar Tasa Online'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dark-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-dark-900 px-2 text-gray-500 font-medium">O Manualmente</span>
            </div>
          </div>

          {/* Manual Edit Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Definir precio del Dólar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">Bs.</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  className="block w-full rounded-xl border border-dark-800 bg-dark-950 py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-dark-800 py-3 text-sm font-bold text-white hover:bg-dark-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-secondary transition-colors shadow-lg shadow-primary/20"
              >
                <Save size={16} />
                Guardar
              </button>
            </div>
          </form>

           <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 text-blue-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">
              Al actualizar la tasa, los precios en Bolívares se recalcularán automáticamente en el catálogo y el carrito.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExchangeRateModal;