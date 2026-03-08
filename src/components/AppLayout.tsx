import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Target, ClipboardCheck, Settings, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new-sample', label: 'New Sample', icon: PlusCircle },
    { to: '/samples', label: 'Samples', icon: List },
    { to: '/targets', label: 'Targets', icon: Target },
    ...(isAdmin ? [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/users', label: 'Users', icon: Users },
    ] : []),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-sidebar-foreground tracking-tight">ISIR Tracker</h1>
              <p className="text-xs text-sidebar-foreground/50">Audit Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-display font-bold text-sidebar-primary">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-1 h-auto">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-xs text-sidebar-foreground/40 font-display">v1.0 — Web Edition</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
