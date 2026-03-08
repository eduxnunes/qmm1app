export type UserRole = 'admin' | 'viewer';

export interface AppUser {
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
}

const USERS_KEY = 'isir_users';
const SESSION_KEY = 'isir_session';

const DEFAULT_USERS: AppUser[] = [
  { username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrator' },
  { username: 'viewer', password: 'viewer123', role: 'viewer', fullName: 'Viewer User' },
];

export function getUsers(): AppUser[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(data);
}

export function saveUsers(users: AppUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function login(username: string, password: string): AppUser | null {
  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role, fullName: user.fullName }));
    return user;
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Omit<AppUser, 'password'> | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  return JSON.parse(data);
}
