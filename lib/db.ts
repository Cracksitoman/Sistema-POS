
import { Product, Sale, Expense } from '../types';

export interface BackupData {
  version: number;
  timestamp: string;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  exchangeRate: number;
}

export const LocalDB = {
  // Generar archivo JSON para descargar
  exportData: (products: Product[], sales: Sale[], expenses: Expense[], exchangeRate: number) => {
    const data: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      products,
      sales,
      expenses,
      exchangeRate
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastpos_respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Leer archivo JSON subido por el usuario
  importData: (file: File): Promise<BackupData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          // Validación básica
          if (!json.products || !json.sales) {
            throw new Error("El archivo no tiene el formato correcto.");
          }
          
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Error leyendo el archivo"));
      reader.readAsText(file);
    });
  }
};
