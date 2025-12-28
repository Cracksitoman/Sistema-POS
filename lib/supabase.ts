
import { createClient } from '@supabase/supabase-js';

// Helper to check both import.meta.env (Vite) and process.env (Standard Node/Webpack)
const getEnvVar = (key: string) => {
  let value = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key];
    }
  } catch (e) {}

  if (!value) {
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        value = process.env[key];
      }
    } catch (e) {}
  }
  return value || '';
};

// Intenta leer las variables con prefijo VITE_ (Requerido para Vite/Vercel)
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Debugging logs para ayudar a verificar en Vercel (Mira la consola del navegador F12)
console.log('[FastPOS] Supabase Config Check:');
console.log('- URL Found:', !!supabaseUrl);
console.log('- Key Found:', !!supabaseAnonKey);

// Check if valid keys are present (not empty and not placeholders)
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn('[FastPOS] Falta configuración. En Vercel las variables DEBEN llamarse VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

// Create client with fallbacks to prevent runtime crash on initialization if keys are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
