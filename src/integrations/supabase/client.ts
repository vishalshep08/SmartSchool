import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Custom sessionStorage adapter
// Session clears automatically when browser tab is closed
// This is the correct behavior for shared school computers
const sessionStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: sessionStorageAdapter, // use sessionStorage explicitly
    storageKey: 'sms-auth',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});