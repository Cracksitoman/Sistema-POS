import { createClient } from '@supabase/supabase-js';

// Safely access environment variables
const getEnvVar = (key: string) => {
  const meta = import.meta as any;
  return meta?.env?.[key] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key is missing. Database features will not work until configured.');
}

// Create client with fallbacks to prevent runtime crash on initialization if keys are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);