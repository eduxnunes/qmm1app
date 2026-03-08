export type UserRole = 'admin' | 'user';

export type PagePermission = 'dashboard' | 'new_sample' | 'samples' | 'targets' | 'settings' | 'users';

export const ALL_PAGES: { key: PagePermission; label: string; path: string }[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'new_sample', label: 'New Sample', path: '/new-sample' },
  { key: 'samples', label: 'Samples', path: '/samples' },
  { key: 'targets', label: 'Targets', path: '/targets' },
  { key: 'settings', label: 'Settings', path: '/settings' },
  { key: 'users', label: 'User Management', path: '/users' },
];

export const DEFAULT_USER_PERMISSIONS: PagePermission[] = ['dashboard', 'new_sample', 'samples'];
export const ADMIN_PERMISSIONS: PagePermission[] = ALL_PAGES.map((p) => p.key);

export interface AppUser {
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  permissions: PagePermission[];
}

const USERS_KEY = 'isir_users';
const SESSION_KEY = 'isir_session';

const DEFAULT_USERS: AppUser[] = [
  { username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrator', permissions: ADMIN_PERMISSIONS },
  { username: 'viewer', password: 'viewer123', role: 'user', fullName: 'Viewer User', permissions: DEFAULT_USER_PERMISSIONS },
];

export function getUsers(): AppUser[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  const users: AppUser[] = JSON.parse(data);
  // Migration: add permissions if missing
  return users.map((u) => ({
    ...u,
    permissions: u.permissions || (u.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS),
  }));
}

export function saveUsers(users: AppUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export type SessionUser = Omit<AppUser, 'password'>;

export function login(username: string, password: string): AppUser | null {
  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    const session: SessionUser = { username: user.username, role: user.role, fullName: user.fullName, permissions: user.role === 'admin' ? ADMIN_PERMISSIONS : user.permissions };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return user;
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): SessionUser | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  const session = JSON.parse(data);
  // Migration
  if (!session.permissions) {
    session.permissions = session.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS;
  }
  return session;
}
