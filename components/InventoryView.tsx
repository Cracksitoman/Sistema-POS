import React, { useState } from 'react';
import { Product } from '../types';
import { Search, Plus, Pencil, Trash2, X, Save, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface InventoryViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  exchangeRate: number;
}

const InventoryView: React.FC<InventoryViewProps> = ({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  exchangeRate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    priceUSD: '',
    priceVES: '',
    category: ''
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', priceUSD: '', priceVES: '', category: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      priceUSD: product.price.toString(),
      priceVES: (product.price * exchangeRate).toFixed(2),
      category: product.category
    });
    setIsModalOpen(true);
  };

  // Handle USD Change -> Auto calculate VES
  const handleUSDChange = (val: string) => {
    setFormData(prev => {
      const numVal = parseFloat(val);
      const newVES = !isNaN(numVal) ? (numVal * exchangeRate).toFixed(2) : '';
      return { ...prev, priceUSD: val, priceVES: newVES };
    });
  };

  // Handle VES Change -> Auto calculate USD
  const handleVESChange = (val: string) => {
    setFormData(prev => {
      const numVal = parseFloat(val);
      const newUSD = !isNaN(numVal) && exchangeRate > 0 ? (numVal / exchangeRate).toFixed(2) : '';
      return { ...prev, priceVES: val, priceUSD: newUSD };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceValue = parseFloat(formData.priceUSD);
    
    if (!formData.name || isNaN(priceValue) || !formData.category) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: formData.name,
        price: priceValue,
        category: formData.category
      });
    } else {
      onAddProduct({
        name: formData.name,
        price: priceValue,
        category: formData.category
      });
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-dark-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-dark-800 bg-dark-950/95 px-4 py-3 md:px-6 md:py-5">
        <div>
          <h1 className="text-lg font-bold text-white">Inventario</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Gestión de Productos</p>
        </div>
        
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-secondary active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span className="hidden md:inline">Nuevo Producto</span>
        </button>
      </header>

      {/* Search & List */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
        <div className="mb-4 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar en inventario..."
              className="block w-full rounded-xl border border-dark-800 bg-dark-900 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="group flex flex-col justify-between rounded-xl bg-dark-900 border border-dark-800 p-4 hover:border-dark-700 transition-colors"
              >
                <div>
                  <span className="mb-1 inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {product.category}
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-lg font-bold text-primary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className="mt-4 flex gap-2 border-t border-dark-800 pt-3">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dark-800 py-2 text-xs font-medium text-white hover:bg-dark-700"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button 
                    onClick={() => setProductToDelete(product)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-500 hover:bg-red-500/20"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-dark-800 text-gray-500 p-8 text-center">
              <div className="mb-4 rounded-full bg-dark-800 p-4">
                 <Search size={32} className="opacity-50" />
              </div>
              <p className="mb-4">No hay productos registrados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-dark-800 p-4">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-dark-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-dark-800 bg-dark-950 p-2.5 text-white focus:border-primary focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                 <label className="block text-xs font-medium text-gray-400">Precio</label>
                 <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="USD"
                        className="w-full rounded-lg border border-dark-800 bg-dark-950 py-2.5 pl-7 pr-3 text-white focus:border-primary focus:outline-none"
                        value={formData.priceUSD}
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
                        placeholder="VES"
                        className="w-full rounded-lg border border-dark-800 bg-dark-950 py-2.5 pl-8 pr-3 text-white focus:border-primary focus:outline-none"
                        value={formData.priceVES}
                        onChange={(e) => handleVESChange(e.target.value)}
                      />
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 text-center">
                    Tasa actual: {exchangeRate.toFixed(2)} Bs/$
                 </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Categoría</label>
                <input
                  type="text"
                  required
                  list="categories"
                  className="w-full rounded-lg border border-dark-800 bg-dark-950 p-2.5 text-white focus:border-primary focus:outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                />
                <datalist id="categories">
                  <option value="Combos" />
                  <option value="Hamburguesas" />
                  <option value="Bebidas" />
                  <option value="Extras" />
                </datalist>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white hover:bg-secondary"
                >
                  <Save size={18} />
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">¿Eliminar producto?</h3>
              <p className="mb-6 text-sm text-gray-400 leading-relaxed">
                ¿Estás seguro de que quieres eliminar <br />
                <span className="text-white font-semibold">"{productToDelete.name}"</span>? 
                <br />Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 rounded-xl bg-dark-800 py-3 text-sm font-bold text-white hover:bg-dark-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;