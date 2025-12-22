export type PaymentMethod = 'cash' | 'card' | 'mobile';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  date: string; // ISO string for storage
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  exchangeRate: number; // Stored rate at the time of sale
}

export type ExpenseCategory = 'expense' | 'loss';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
}