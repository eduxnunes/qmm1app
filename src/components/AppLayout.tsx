import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Target, ClipboardCheck } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new-sample', label: 'New Sample', icon: PlusCircle },
  { to: '/samples', label: 'Samples', icon: List },
  { to: '/targets', label: 'Targets', icon: Target },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
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
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 font-display">v1.0 — Web Edition</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
