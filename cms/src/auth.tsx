import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken } from './api';

interface Admin {
  id: string;
  email: string;
  name: string;
  superAdmin: boolean;
  permissions: Record<string, number>;
  roles: string[];
}

interface AuthCtx {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (key: string, level?: number) => boolean;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);
const ADMIN_KEY = 'divideyou_cms_admin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      const cached = localStorage.getItem(ADMIN_KEY);
      if (cached) setAdmin(JSON.parse(cached));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/admin/login', { email, password });
    setToken(res.authToken);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(res.user));
    setAdmin(res.user);
  };

  const logout = () => {
    api.get('/admin/logout').catch(() => {});
    setToken(null);
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  };

  const can = (key: string, level = 1) =>
    !!admin && (admin.superAdmin || (admin.permissions?.[key] ?? 0) >= level);

  return <Ctx.Provider value={{ admin, loading, login, logout, can }}>{children}</Ctx.Provider>;
}
