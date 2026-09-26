import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authApi } from '../api/auth';
import type { UserRole } from '../api/auth';

export type { UserRole };

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
    role?: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser =
        localStorage.getItem('cepagrade_user') || localStorage.getItem('onionvision_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return (
      localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token')
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const saveSession = useCallback((authToken: string, authUser: User) => {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('cepagrade_token', authToken);
    localStorage.setItem('cepagrade_user', JSON.stringify(authUser));
    // Backwards-compatibility for existing backend API client interceptors
    localStorage.setItem('onionvision_token', authToken);
    localStorage.setItem('onionvision_user', JSON.stringify(authUser));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cepagrade_token');
    localStorage.removeItem('cepagrade_user');
    localStorage.removeItem('onionvision_token');
    localStorage.removeItem('onionvision_user');
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // 1. Supabase Session Check
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const meta = session.user.user_metadata || {};
            const authUser: User = {
              id: session.user.id,
              name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Operator',
              email: session.user.email || '',
              role: (meta.role as UserRole) || 'operator',
              is_active: true,
              created_at: session.user.created_at,
            };
            saveSession(session.access_token, authUser);
          } else if (!session && isMounted) {
            // Check if there was an offline / local development token
            const localToken = localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
            if (localToken && !localToken.startsWith('sb-')) {
              // Attempt to validate with backend /api/auth/me
              try {
                const currentUser = await authApi.getMe();
                if (isMounted) {
                  const mapped: User = {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    is_active: currentUser.is_active,
                    created_at: currentUser.created_at,
                  };
                  saveSession(localToken, mapped);
                }
              } catch {
                clearSession();
              }
            } else {
              clearSession();
            }
          }
        } else {
          // 2. Local / Development Backend Session Check (Offline mode)
          const storedToken =
            localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
          if (storedToken) {
            try {
              const currentUser = await authApi.getMe();
              if (isMounted) {
                const mapped: User = {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  role: currentUser.role,
                  is_active: currentUser.is_active,
                  created_at: currentUser.created_at,
                };
                saveSession(storedToken, mapped);
              }
            } catch {
              clearSession();
            }
          }
        }
      } catch (err: any) {
        console.warn('Auth initialization check notice:', err?.message || err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen to Supabase Auth state changes if configured
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const authUser: User = {
            id: session.user.id,
            name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Operator',
            email: session.user.email || '',
            role: (meta.role as UserRole) || 'operator',
            is_active: true,
            created_at: session.user.created_at,
          };
          saveSession(session.access_token, authUser);
        } else {
          clearSession();
        }
        setIsLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [saveSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both email and password.');
        }

        if (isSupabaseConfigured && supabase) {
          // Real Supabase Auth login
          const { data, error: supaErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (supaErr) {
            // Provide human-friendly error messages
            if (supaErr.message.includes('Invalid login credentials')) {
              throw new Error('Invalid email or password. Please verify your credentials.');
            }
            if (supaErr.message.includes('Email not confirmed')) {
              throw new Error('Please confirm your email address before signing in.');
            }
            throw new Error(supaErr.message);
          }

          if (data.session && data.user) {
            const meta = data.user.user_metadata || {};
            const authUser: User = {
              id: data.user.id,
              name: meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Operator',
              email: data.user.email || email,
              role: (meta.role as UserRole) || 'operator',
              is_active: true,
              created_at: data.user.created_at,
            };
            saveSession(data.session.access_token, authUser);
          }
        } else {
          // Fallback to local FastAPI development auth (e.g. demo credentials)
          const res = await authApi.login({ email: email.trim(), password });
          saveSession(res.access_token, {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            is_active: res.user.is_active,
            created_at: res.user.created_at,
          });
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || 'Login failed. Please try again.';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [saveSession]
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword?: string,
      role: UserRole = 'operator'
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('All fields are required.');
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        // Strict security rule: Never allow public users to self-register as admin
        if (role === 'admin') {
          throw new Error('Public registration for the Administrator role is strictly restricted.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new Error('Please enter a valid email address.');
        }

        if (isSupabaseConfigured && supabase) {
          // Real Supabase Auth signup
          const { data, error: supaErr } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim(),
                role: role || 'operator',
              },
            },
          });

          if (supaErr) {
            if (supaErr.message.includes('User already registered')) {
              throw new Error('An account with this email address already exists. Please sign in instead.');
            }
            throw new Error(supaErr.message);
          }

          if (data.session && data.user) {
            const authUser: User = {
              id: data.user.id,
              name: name.trim(),
              email: data.user.email || email,
              role: role || 'operator',
              is_active: true,
              created_at: data.user.created_at,
            };
            saveSession(data.session.access_token, authUser);
          } else {
            // Email confirmation required by Supabase project settings
            setError('Registration submitted! If email confirmation is enabled on your Supabase project, please check your inbox.');
          }
        } else {
          // Fallback to local FastAPI development auth
          const res = await authApi.signup({
            name: name.trim(),
            email: email.trim(),
            password,
            role: role || 'operator',
          });
          saveSession(res.access_token, {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            is_active: res.user.is_active,
            created_at: res.user.created_at,
          });
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || 'Registration failed. Please try again.';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [saveSession]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        await authApi.logout().catch(() => {});
      }
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isSupabaseConfigured,
        login,
        signup,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
