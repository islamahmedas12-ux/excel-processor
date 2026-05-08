import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOKEN_STORAGE_KEY } from '../services/api';

interface AdminUser { username: string; role: string }

interface AuthCtx {
  user: AdminUser | null;
  isLoading: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<AdminUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin' && payload.exp * 1000 > Date.now()) {
          setUser({ username: payload.username ?? payload.sub, role: 'admin' });
        } else {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token: string, adminUser: AdminUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(adminUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, isLoading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = (): AuthCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
