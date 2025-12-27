
// Este archivo reemplaza la lógica de Supabase por llamadas a nuestra propia API en Netlify Functions
import { Product, Sale, Expense, OrderStatus } from '../types';

const API_URL = '/api';

export const db = {
  // Inicializar tablas (se llama al principio)
  init: async () => {
    try {
      await fetch(`${API_URL}?action=init`);
      return true;
    } catch (e) {
      console.error("Error connecting to DB", e);
      return false;
    }
  },

  // Obtener todo
  getAll: async () => {
    const res = await fetch(`${API_URL}?action=get-all`);
    if (!res.ok) throw new Error('Error fetching data');
    return await res.json();
  },

  // Ventas
  saveSale: async (sale: Sale) => {
    await fetch(`${API_URL}?action=save-sale`, {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },

  updateSaleStatus: async (id: string, status: OrderStatus) => {
    await fetch(`${API_URL}?action=update-sale-status`, {
      method: 'POST',
      body: JSON.stringify({ id, status }),
    });
  },

  // Productos
  addProduct: async (product: Product) => {
    await fetch(`${API_URL}?action=save-product`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  updateProduct: async (product: Product) => {
    await fetch(`${API_URL}?action=update-product`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  deleteProduct: async (id: string) => {
    await fetch(`${API_URL}?action=delete-product`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // Gastos
  addExpense: async (expense: Expense) => {
    await fetch(`${API_URL}?action=save-expense`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  deleteExpense: async (id: string) => {
    await fetch(`${API_URL}?action=delete-expense`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }
};
