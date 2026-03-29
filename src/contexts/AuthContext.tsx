import {
  createContext, useContext, useEffect, useState,
  useRef, useCallback
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'admin' | 'super_admin' | 'teacher' | 'parent' | 'staff' | 'principal';

interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: any;
  role: UserRole | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) =>
    Promise<{ error: string | null; role: UserRole | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fetch role — always from user_roles table
const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(); // use maybeSingle — never throws on 0 rows
    if (error || !data) return null;
    return data.role as UserRole;
  } catch {
    return null;
  }
};

// Fetch profile from profiles table
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone || undefined,
      avatarUrl: data.avatar_url || undefined,
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    profile: null,
    isAuthenticated: false,
    authInitialized: false,
  });

  // Single ref to track if initialized — prevents double-setting
  const initialized = useRef(false);
  // Track mounted state to prevent setState after unmount
  const mounted = useRef(true);

  // Single setState wrapper that checks mounted
  const safeSetState = useCallback((update: Partial<AuthState>) => {
    if (mounted.current) {
      setState(prev => ({ ...prev, ...update }));
    }
  }, []);

  // Mark as initialized — can only happen once
  const markInitialized = useCallback((authData: Partial<AuthState>) => {
    if (initialized.current) return;
    initialized.current = true;
    safeSetState({ ...authData, authInitialized: true });
  }, [safeSetState]);

  useEffect(() => {
    mounted.current = true;
    initialized.current = false;

    // Safety timeout — if nothing happens in 5 seconds, force initialize
    const safetyTimer = setTimeout(() => {
      console.warn('[AUTH] Safety timeout — forcing initialized');
      markInitialized({
        user: null, role: null, profile: null, isAuthenticated: false
      });
    }, 5000);

    // Set up cross-tab and global logout listener
    const channel = new BroadcastChannel('sms-auth-sync');
    const handleLogoutEvent = async () => {
      safeSetState({ user: null, role: null, profile: null, isAuthenticated: false });
      try { await supabase.auth.signOut(); } catch {}
      try {
        sessionStorage.removeItem('sms-auth');
        localStorage.removeItem('sms-auth');
        Object.keys(sessionStorage).filter(k => k.startsWith('sb-')).forEach(k => sessionStorage.removeItem(k));
      } catch {}
      window.location.href = '/login';
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    channel.onmessage = (event) => {
      if (event.data === 'LOGOUT') handleLogoutEvent();
    };

    // Set up inactivity timer (30 minutes)
    let inactivityTimeout: any;
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        toast?.('Session expired due to inactivity');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(e => document.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    // Step 1: Check for existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } =
          await supabase.auth.getSession();

        if (!mounted.current) return;

        if (error || !session?.user) {
          // No session — user is logged out
          markInitialized({
            user: null, role: null, profile: null, isAuthenticated: false
          });
          clearTimeout(safetyTimer);
          return;
        }

        // Session found — get role and profile
        const [role, profile] = await Promise.all([
          fetchUserRole(session.user.id),
          fetchUserProfile(session.user.id),
        ]);

        if (!mounted.current) return;

        if (!role) {
          // Session exists but no role — invalid/stale
          await supabase.auth.signOut();
          try {
            localStorage.removeItem('sms-auth');
          } catch {}
          markInitialized({
            user: null, role: null, profile: null, isAuthenticated: false
          });
          clearTimeout(safetyTimer);
          return;
        }

        markInitialized({
          user: session.user,
          role,
          profile,
          isAuthenticated: true,
        });
        clearTimeout(safetyTimer);

      } catch (err) {
        console.error('[AUTH] Init error:', err);
        markInitialized({
          user: null, role: null, profile: null, isAuthenticated: false
        });
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    // Step 2: Listen ONLY for explicit sign in/out events
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        // STRICTLY ignore these events — they cause loops
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') return;
        if (event === 'MFA_CHALLENGE_VERIFIED') return;
        if (!mounted.current) return;

        if (event === 'SIGNED_OUT') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Only update if not already initialized with this user
          if (state.user?.id === session.user.id) return; // already set

          const [role, profile] = await Promise.all([
            fetchUserRole(session.user.id),
            fetchUserProfile(session.user.id),
          ]);
          if (mounted.current && role) {
            safeSetState({
              user: session.user,
              role,
              profile,
              isAuthenticated: true,
            });
          }
        }
      });

    return () => {
      mounted.current = false;
      clearTimeout(safetyTimer);
      clearTimeout(inactivityTimeout);
      activityEvents.forEach(e => document.removeEventListener(e, resetInactivityTimer));
      window.removeEventListener('auth:logout', handleLogoutEvent);
      channel.close();
      subscription.unsubscribe();
    };
  }, []); // EMPTY DEPS — never re-runs

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({ email, password });

      if (error) return { error: error.message, role: null };
      if (!data.user) return { error: 'Login failed', role: null };

      const [role, profile] = await Promise.all([
        fetchUserRole(data.user.id),
        fetchUserProfile(data.user.id),
      ]);

      if (!role) {
        await supabase.auth.signOut();
        return {
          error: 'Account not configured. Contact administrator.',
          role: null
        };
      }

      safeSetState({ user: data.user, role, profile, isAuthenticated: true });
      return { error: null, role };

    } catch (err: any) {
      return { error: err.message || 'Login failed', role: null };
    }
  }, [safeSetState]);

  const logout = useCallback(async () => {
    try {
      const channel = new BroadcastChannel('sms-auth-sync');
      channel.postMessage('LOGOUT');
      channel.close();
    } catch {}
    
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { UserRole, UserProfile };
