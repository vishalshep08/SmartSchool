import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Module-level singleton — created once, never recreated
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // disable URL detection to prevent loops
    storageKey: 'sms-auth', // custom key
    storage: {
      // Use sessionStorage for auto-logout when tab closes
      getItem: (key) => {
        try { return sessionStorage.getItem(key); } catch { return null; }
      },
      setItem: (key, value) => {
        try { sessionStorage.setItem(key, value); } catch {}
      },
      removeItem: (key) => {
        try { sessionStorage.removeItem(key); } catch {}
      },
    },
  },
});