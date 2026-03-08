import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Target, ClipboardCheck, Settings, Users, LogOut, Link2, Upload, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PagePermission } from '@/lib/auth';
import { importFromExcel, exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';

const NAV_ITEMS: { to: string; label: string; icon: React.ElementType; permission: PagePermission }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { to: '/new-sample', label: 'New Sample', icon: PlusCircle, permission: 'new_sample' },
  { to: '/samples', label: 'Samples', icon: List, permission: 'samples' },
  { to: '/targets', label: 'Targets', icon: Target, permission: 'targets' },
  { to: '/links', label: 'Links', icon: Link2, permission: 'links' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings' },
  { to: '/users', label: 'Users', icon: Users, permission: 'users' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleNav = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      toast.success(`Imported: ${result.samples} samples, ${result.targets} targets, ${result.users} users`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} warnings during import`);
      }
      // Reload page to reflect imported data
      window.location.reload();
    } catch (err) {
      toast.error('Failed to import Excel file');
      console.error(err);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    try {
      exportToExcel();
      toast.success('Excel file downloaded');
    } catch (err) {
      toast.error('Failed to export');
      console.error(err);
    }
  };

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
          {visibleNav.map(({ to, label, icon: Icon }) => {
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

          {/* Excel Import/Export */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-sidebar-border space-y-1">
              <p className="px-3 text-[10px] font-display text-sidebar-foreground/40 uppercase tracking-wider mb-2">Excel Sync</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          )}
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
