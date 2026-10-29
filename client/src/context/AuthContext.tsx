import React, { createContext, useContext, useState, useEffect } from 'react';
import { request } from '../api/client.js';

export type Role = 'SUPERADMIN' | 'ADMIN_PANITIA' | 'PETUGAS' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('watt_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('watt_token');
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const savedToken = localStorage.getItem('watt_token');
      if (savedToken) {
        try {
          const res = await request('/auth/me');
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('watt_user', JSON.stringify(res.data));
          }
        } catch (e) {
          localStorage.removeItem('watt_token');
          localStorage.removeItem('watt_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('watt_token', newToken);
    localStorage.setItem('watt_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      if (token) {
        await request('/auth/logout', { method: 'POST' }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('watt_token');
      localStorage.removeItem('watt_user');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
