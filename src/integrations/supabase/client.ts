import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// In-memory storage adapter
// Session lives only in JS heap — cleared on page refresh AND tab close
// This means: refresh = logout, which is required for shared school computers
const _memStore: Record<string, string> = {};
const memoryStorageAdapter = {
  getItem: (key: string): string | null => _memStore[key] ?? null,
  setItem: (key: string, value: string): void => { _memStore[key] = value; },
  removeItem: (key: string): void => { delete _memStore[key]; },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: memoryStorageAdapter, // in-memory — clears on refresh and tab close
    storageKey: 'sms-auth',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});