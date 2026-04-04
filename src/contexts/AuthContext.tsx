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
  login: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; role: UserRole | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fetch role from user_roles table
// Always use maybeSingle — never throws on 0 rows
const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
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

  const mounted = useRef(true);
  const initDone = useRef(false);

  useEffect(() => {
    mounted.current = true;
    initDone.current = false;

    const init = async () => {
      try {
        // getSession reads from sessionStorage via our custom adapter
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted.current) return;

        if (error || !session?.user) {
          // No session in sessionStorage — user is logged out
          // This is normal behavior for tab-close logout
          if (mounted.current && !initDone.current) {
            initDone.current = true;
            setUser(null);
            setRole(null);
            setIsAuthenticated(false);
            setAuthInitialized(true);
          }
          return;
        }

        // Session found — verify role exists
        const userRole = await fetchUserRole(session.user.id);

        if (!mounted.current) return;

        if (!userRole) {
          // Session exists but no role — sign out cleanly
          await supabase.auth.signOut();
          if (mounted.current && !initDone.current) {
            initDone.current = true;
            setUser(null);
            setRole(null);
            setIsAuthenticated(false);
            setAuthInitialized(true);
          }
          return;
        }

        // Valid session and role — set authenticated state
        if (mounted.current && !initDone.current) {
          initDone.current = true;
          setUser(session.user);
          setRole(userRole);
          setIsAuthenticated(true);
          setAuthInitialized(true);
        }
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

    init();

    // Listen ONLY for explicit sign in / sign out
    // Ignore INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED completely
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // These events must be completely ignored
      // They fire automatically and cause loops
      if (
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        return;
      }

      if (!mounted.current) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Prevent redundant updates if already authenticated as the same user
        if (user?.id === session.user.id) return;

        const userRole = await fetchUserRole(session.user.id);
        if (mounted.current && userRole) {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error: error.message, role: null };
      if (!data.user) return { error: 'Login failed', role: null };

      const userRole = await fetchUserRole(data.user.id);
      if (!userRole) {
        await supabase.auth.signOut();
        return {
          error: 'Account not configured. Contact administrator.',
          role: null,
        };
      }

      setUser(data.user);
      setRole(userRole);
      setIsAuthenticated(true);

      return { error: null, role: userRole };
    } catch (err: any) {
      return { error: err.message || 'Login failed', role: null };
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear state immediately
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);

    try {
      await supabase.auth.signOut();
    } catch {}

    // Clear sessionStorage auth token
    try {
      sessionStorage.removeItem('sms-auth');
    } catch {}

    // Hard redirect — clears all React in-memory state
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        authInitialized,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
