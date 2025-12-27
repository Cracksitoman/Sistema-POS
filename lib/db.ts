
import { supabase, isSupabaseConfigured } from './supabase';
import { Product, Sale, Expense, OrderStatus } from '../types';

export const db = {
  // Verificación de conexión simple
  init: async () => {
    // Si no está configurado, fallar silenciosamente para modo offline
    if (!isSupabaseConfigured) return false;

    try {
      const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return true;
    } catch (e: any) {
      // Loggear el mensaje específico en lugar del objeto genérico
      console.warn("Offline Mode - Supabase connection failed:", e.message || e);
      return false;
    }
  },

  // Obtener todos los datos iniciales
  getAll: async () => {
    if (!isSupabaseConfigured) return { products: [], sales: [], expenses: [] };

    const [productsRes, salesRes, expensesRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('sales').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false })
    ]);

    if (productsRes.error) console.error("Error fetching products:", productsRes.error.message);
    if (salesRes.error) console.error("Error fetching sales:", salesRes.error.message);
    if (expensesRes.error) console.error("Error fetching expenses:", expensesRes.error.message);

    return {
      products: productsRes.data || [],
      sales: salesRes.data || [],
      expenses: expensesRes.data || []
    };
  },

  // --- Ventas ---
  saveSale: async (sale: Sale) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('sales').insert(sale);
    if (error) console.error("Error saving sale:", error.message);
  },

  updateSaleStatus: async (id: string, status: OrderStatus) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('sales').update({ status }).eq('id', id);
    if (error) console.error("Error updating sale status:", error.message);
  },

  // --- Productos ---
  addProduct: async (product: Product) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('products').insert(product);
    if (error) console.error("Error adding product:", error.message);
  },

  updateProduct: async (product: Product) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('products').update(product).eq('id', product.id);
    if (error) console.error("Error updating product:", error.message);
  },

  deleteProduct: async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error("Error deleting product:", error.message);
  },

  // --- Gastos ---
  addExpense: async (expense: Expense) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) console.error("Error adding expense:", error.message);
  },

  deleteExpense: async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.error("Error deleting expense:", error.message);
  }
};
