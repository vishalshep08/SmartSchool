import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole =
  | 'admin'
  | 'super_admin'
  | 'teacher'
  | 'parent'
  | 'staff'
  | 'principal';

interface AuthContextType {
  user: any;
  role: UserRole | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
  login: (email: string, password: string) =>
    Promise<{ error: string | null; role: UserRole | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard',
  super_admin: '/super-admin/dashboard',
  teacher: '/dashboard-teacher',
  parent: '/parent/dashboard',
  staff: '/dashboard-staff',
  principal: '/dashboard',
};

// Stable role fetch — never throws
const fetchRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.role as UserRole;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Refs to prevent stale closures and double-execution
  const mounted = useRef(true);
  const initDone = useRef(false);
  // Store current userId in ref to prevent redundant role fetches
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    initDone.current = false;
    currentUserId.current = null;

    const initialize = async () => {
      try {
        const { data: { session }, error } =
          await supabase.auth.getSession();

        if (!mounted.current || initDone.current) return;

        if (error || !session?.user) {
          // No session — user logged out or tab was closed
          initDone.current = true;
          setUser(null);
          setRole(null);
          setIsAuthenticated(false);
          setAuthInitialized(true);
          return;
        }

        const userRole = await fetchRole(session.user.id);

        if (!mounted.current || initDone.current) return;

        if (!userRole) {
          // Session exists but no role — sign out
          await supabase.auth.signOut();
          initDone.current = true;
          setUser(null);
          setRole(null);
          setIsAuthenticated(false);
          setAuthInitialized(true);
          return;
        }

        // Valid session
        initDone.current = true;
        currentUserId.current = session.user.id;
        setUser(session.user);
        setRole(userRole);
        setIsAuthenticated(true);
        setAuthInitialized(true);

      } catch (err) {
        console.error('[AUTH] Init error:', err);
        if (mounted.current && !initDone.current) {
          initDone.current = true;
          setUser(null);
          setRole(null);
          setIsAuthenticated(false);
          setAuthInitialized(true);
        }
      }
    };

    initialize();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: ignore events that cause loops
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') return; // token auto-refreshed silently
        if (event === 'USER_UPDATED') return;
        if (event === 'MFA_CHALLENGE_VERIFIED') return;

        if (!mounted.current) return;

        if (event === 'SIGNED_OUT') {
          currentUserId.current = null;
          setUser(null);
          setRole(null);
          setIsAuthenticated(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Skip if same user already authenticated
          // This prevents re-fetching role on token refresh side effects
          if (currentUserId.current === session.user.id) return;

          const userRole = await fetchRole(session.user.id);
          if (mounted.current && userRole) {
            currentUserId.current = session.user.id;
            setUser(session.user);
            setRole(userRole);
            setIsAuthenticated(true);
          }
        }
      });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // runs exactly once

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({ email, password });

      if (error) return { error: error.message, role: null };
      if (!data.user) return { error: 'Login failed', role: null };

      const userRole = await fetchRole(data.user.id);
      if (!userRole) {
        await supabase.auth.signOut();
        return {
          error: 'Account not configured. Contact your administrator.',
          role: null,
        };
      }

      currentUserId.current = data.user.id;
      setUser(data.user);
      setRole(userRole);
      setIsAuthenticated(true);

      return { error: null, role: userRole };
    } catch (err: any) {
      return { error: err.message || 'Login failed', role: null };
    }
  }, []);

  const logout = useCallback(async () => {
    currentUserId.current = null;
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);

    try {
      await supabase.auth.signOut();
    } catch {}

    // Clear local storage session
    try {
      window.localStorage.removeItem('sms-auth-session');
    } catch {}

    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const handleGlobalLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleGlobalLogout);
    return () => window.removeEventListener('auth:logout', handleGlobalLogout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user, role, isAuthenticated, authInitialized, login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
