
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'zelle';

export type OrderStatus = 'pending' | 'ready' | 'completed' | 'cancelled';

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
  orderNumber: number; // Daily incremental number
  date: string; // ISO string
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  exchangeRate: number;
  status: OrderStatus;
  customerName?: string;
}

export type ExpenseCategory = 'expense' | 'loss';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
}
