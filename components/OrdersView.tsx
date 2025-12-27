import React from 'react';
import { Sale, OrderStatus } from '../types';
import { Clock, CheckCircle2, User, Receipt, Timer, Check } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface OrdersViewProps {
  orders: Sale[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

interface OrderCardProps {
  order: Sale;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus }) => {
  const isPending = order.status === 'pending';
  const isReady = order.status === 'ready';
  const isCompleted = order.status === 'completed';

  const timeString = new Date(order.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col rounded-xl border p-4 transition-all ${
      isPending 
        ? 'bg-yellow-500/5 border-yellow-500/20' 
        : isReady 
          ? 'bg-green-500/5 border-green-500/20' 
          : 'bg-dark-900 border-dark-800 opacity-60'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${
            isPending ? 'text-yellow-500' : isReady ? 'text-green-500' : 'text-gray-500'
          }`}>
            {isPending ? 'Pendiente' : isReady ? 'Listo' : 'Entregado'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">#{order.orderNumber}</span>
            <span className="text-sm font-medium text-gray-400 flex items-center gap-1">
               <User size={12} /> {order.customerName}
            </span>
          </div>
        </div>
        <div className="text-right">
           <span className="text-xs font-mono text-gray-500 flex items-center gap-1 justify-end">
             <Clock size={12} /> {timeString}
           </span>
           <span className="text-xs font-bold text-gray-400 mt-1 block">
             {formatCurrency(order.total)}
           </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 mb-4 border-t border-dashed border-gray-800 pt-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-sm">
             <span className="text-gray-200">
               <span className="font-bold text-primary mr-2">{item.quantity}x</span> 
               {item.name}
             </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-auto">
        {isPending && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'ready')}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Marcar Listo
          </button>
        )}
        {isReady && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'completed')}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> Entregar
          </button>
        )}
        {(!isCompleted && !isPending && !isReady) && (
            <span className="text-xs text-gray-500 text-center w-full">Finalizado</span>
        )}
      </div>
    </div>
  );
};

const OrdersView: React.FC<OrdersViewProps> = ({ orders, onUpdateStatus }) => {
  // Filter active orders (Pending and Ready) - exclude completed/cancelled from main view usually
  // But let's show Today's orders
  const today = new Date().toDateString();
  const todaysOrders = orders.filter(o => new Date(o.date).toDateString() === today);

  const pendingOrders = todaysOrders.filter(o => o.status === 'pending').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const readyOrders = todaysOrders.filter(o => o.status === 'ready').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const completedOrders = todaysOrders.filter(o => o.status === 'completed' || o.status === 'cancelled').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex h-full w-full flex-col bg-dark-950">
      <header className="flex items-center justify-between border-b border-dark-800 bg-dark-950/95 px-4 py-3 md:px-6 md:py-5">
        <div>
          <h1 className="text-lg font-bold text-white">Pedidos</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Gestión de Cocina y Despacho</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Timer size={14} className="text-yellow-500"/>
                <span className="text-xs font-bold text-yellow-500">{pendingOrders.length} Pendientes</span>
            </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-4 md:p-6 scrollbar-hide">
        <div className="flex gap-6 h-full min-w-[300px]">
           
           {/* Column 1: Pending */}
           <div className="flex-1 min-w-[280px] max-w-sm flex flex-col">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
                 <span className="w-2 h-2 rounded-full bg-yellow-500"></span> En Preparación
              </h2>
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide pb-20">
                 {pendingOrders.length === 0 && (
                    <div className="p-8 border border-dashed border-dark-800 rounded-xl text-center text-gray-600 text-sm">
                       No hay pedidos pendientes
                    </div>
                 )}
                 {pendingOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />)}
              </div>
           </div>

           {/* Column 2: Ready */}
           <div className="flex-1 min-w-[280px] max-w-sm flex flex-col">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span> Listo para Entregar
              </h2>
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide pb-20">
                 {readyOrders.length === 0 && (
                    <div className="p-8 border border-dashed border-dark-800 rounded-xl text-center text-gray-600 text-sm">
                       Nada listo por ahora
                    </div>
                 )}
                 {readyOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />)}
              </div>
           </div>

           {/* Column 3: Completed (Optional on mobile, maybe hidden) */}
           <div className="hidden lg:flex flex-1 min-w-[280px] max-w-sm flex-col">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
                 <span className="w-2 h-2 rounded-full bg-gray-600"></span> Entregados Hoy
              </h2>
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide pb-20">
                 {completedOrders.slice(0, 10).map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />)}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default OrdersView;