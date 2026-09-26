import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User, UserRole } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('onionvision_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('onionvision_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on initial boot
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('onionvision_token');
      if (storedToken) {
        try {
          const currentUser = await authApi.getMe();
          setUser(currentUser);
          localStorage.setItem('onionvision_user', JSON.stringify(currentUser));
        } catch {
          // Token expired or invalid
          localStorage.removeItem('onionvision_token');
          localStorage.removeItem('onionvision_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('onionvision_token', res.access_token);
      localStorage.setItem('onionvision_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role: UserRole = 'operator') => {
    setIsLoading(true);
    try {
      const res = await authApi.signup({ name, email, password, role });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('onionvision_token', res.access_token);
      localStorage.setItem('onionvision_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    } finally {
      localStorage.removeItem('onionvision_token');
      localStorage.removeItem('onionvision_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
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
