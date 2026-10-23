import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin } from '../api';
import type { Role } from '../api/types';

interface AuthState {
  token: string | null;
  role: Role | null;
  fullName: string;
  email: string;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStorage(): AuthState {
  return {
    token: localStorage.getItem('axa_token'),
    role: (localStorage.getItem('axa_role') as Role | null) ?? null,
    fullName: localStorage.getItem('axa_full_name') ?? '',
    email: localStorage.getItem('axa_email') ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readStorage);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin({ username, password });
    const email = res.full_name
      ? `${res.full_name.split(' ')[0]?.[0]?.toLowerCase() ?? ''}.${res.full_name.split(' ').slice(-1)[0]?.toLowerCase() ?? ''}@axamansard.com`
      : username;
    localStorage.setItem('axa_token', res.access_token);
    localStorage.setItem('axa_role', res.role);
    localStorage.setItem('axa_full_name', res.full_name);
    localStorage.setItem('axa_email', email);
    setState({ token: res.access_token, role: res.role, fullName: res.full_name, email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('axa_token');
    localStorage.removeItem('axa_role');
    localStorage.removeItem('axa_full_name');
    localStorage.removeItem('axa_email');
    setState({ token: null, role: null, fullName: '', email: '' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.token !== null,
      isAdmin: state.role === 'admin',
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
