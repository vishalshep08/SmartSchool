import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// sessionStorage adapter
// Session persists across React Router navigation within the same tab
// Session clears automatically when browser tab is closed
// This is the correct behavior for shared school computers
const sessionStorageAdapter = {
  getItem: (key: string): string | null => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

// Singleton — created once, never recreated
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storage: sessionStorageAdapter,
      storageKey: 'sms-auth-session',
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);