import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken } from './api';

interface Profile {
  clientId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  type: number;
  accessFeePaid: boolean;
  detailDataConfirmed: boolean;
  partnerNumber?: string;
  partnershipTermAccepted: boolean;
  roles: string[];
}

interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get('/profile/data');
      setUser(data.profile);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/login', { email, password });
    setToken(res.authToken);
    setUser(res.user);
  };

  const logout = () => {
    api.get('/logout').catch(() => {});
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}
