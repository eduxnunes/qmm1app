import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppUser, SessionUser, PagePermission, getSession, login as doLogin, logout as doLogout, ADMIN_PERMISSIONS } from '@/lib/auth';

interface AuthContextType {
  user: SessionUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  hasPermission: (page: PagePermission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => getSession());

  const login = useCallback((username: string, password: string) => {
    const result = doLogin(username, password);
    if (result) {
      setUser({
        username: result.username,
        role: result.role,
        fullName: result.fullName,
        permissions: result.role === 'admin' ? ADMIN_PERMISSIONS : result.permissions,
      });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  const hasPermission = useCallback((page: PagePermission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(page);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin', hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
