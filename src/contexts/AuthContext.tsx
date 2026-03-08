import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppUser, getSession, login as doLogin, logout as doLogout } from '@/lib/auth';

interface AuthContextType {
  user: Omit<AppUser, 'password'> | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => getSession());

  const login = useCallback((username: string, password: string) => {
    const result = doLogin(username, password);
    if (result) {
      setUser({ username: result.username, role: result.role, fullName: result.fullName });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
