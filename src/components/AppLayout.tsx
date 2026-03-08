import { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Target, ClipboardCheck, Settings, Users, LogOut, Link2, Upload, Download, HardDrive, Unplug, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PagePermission } from '@/lib/auth';
import {
  importFromExcel, exportToExcel, isFileSystemSupported,
  pickExcelFile, pickSaveLocation, getLinkedFileName,
  isAutoSaveActive, disconnectFile, autoSaveToExcel, importFromLinkedFile,
} from '@/lib/excel';
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
  const [linkedFile, setLinkedFile] = useState<string | null>(getLinkedFileName());
  const [connected, setConnected] = useState(false);

  // Listen for storage changes to auto-save
  useEffect(() => {
    if (!connected) return;

    const handleStorage = () => {
      autoSaveToExcel().then((ok) => {
        if (!ok && connected) {
          // Handle permission loss silently
        }
      });
    };

    // Intercept localStorage.setItem to trigger auto-save
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (key.startsWith('isir_')) {
        // Debounce auto-save
        clearTimeout((window as any).__autoSaveTimer);
        (window as any).__autoSaveTimer = setTimeout(handleStorage, 500);
      }
    };

    return () => {
      localStorage.setItem = originalSetItem;
    };
  }, [connected]);

  const visibleNav = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      toast.success(`Imported: ${result.samples} samples, ${result.targets} targets, ${result.users} users`);
      window.location.reload();
    } catch (err) {
      toast.error('Failed to import Excel file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    try {
      exportToExcel();
      toast.success('Excel file downloaded');
    } catch {
      toast.error('Failed to export');
    }
  };

  const handleLinkFile = async () => {
    const result = await pickExcelFile();
    if (result) {
      setLinkedFile(result.name);
      setConnected(true);
      // Import data from linked file
      try {
        const importResult = await importFromLinkedFile();
        if (importResult) {
          toast.success(`Linked to ${result.name} — imported ${importResult.samples} samples`);
          window.location.reload();
        }
      } catch {
        toast.success(`Linked to ${result.name} — auto-save enabled`);
      }
    }
  };

  const handleLinkNewFile = async () => {
    const result = await pickSaveLocation();
    if (result) {
      setLinkedFile(result.name);
      setConnected(true);
      await autoSaveToExcel();
      toast.success(`Created and linked to ${result.name}`);
    }
  };

  const handleDisconnect = () => {
    disconnectFile();
    setLinkedFile(null);
    setConnected(false);
    toast.info('Disconnected from Excel file');
  };

  const handleManualSync = async () => {
    const ok = await autoSaveToExcel();
    if (ok) {
      toast.success('Saved to Excel');
    } else {
      toast.error('Save failed — file may need to be re-linked');
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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

          {/* Excel Sync Section */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-sidebar-border space-y-1">
              <p className="px-3 text-[10px] font-display text-sidebar-foreground/40 uppercase tracking-wider mb-2">Excel Sync</p>

              {/* Linked file status */}
              {connected && linkedFile ? (
                <div className="px-3 py-2 rounded-lg bg-success/10 border border-success/20 mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-[11px] font-display text-success truncate">{linkedFile}</span>
                  </div>
                  <p className="text-[10px] text-success/70 mt-0.5 ml-5">Auto-save active</p>
                </div>
              ) : linkedFile ? (
                <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span className="text-[11px] font-display text-warning truncate">{linkedFile}</span>
                  </div>
                  <p className="text-[10px] text-warning/70 mt-0.5 ml-5">Re-link to enable auto-save</p>
                </div>
              ) : null}

              {isFileSystemSupported() && (
                <>
                  {connected ? (
                    <>
                      <button onClick={handleManualSync} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
                        <RefreshCw className="w-4 h-4" /> Save Now
                      </button>
                      <button onClick={handleDisconnect} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-destructive hover:bg-sidebar-accent/50 transition-colors w-full">
                        <Unplug className="w-4 h-4" /> Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleLinkFile} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
                        <HardDrive className="w-4 h-4" /> Link Excel File
                      </button>
                      <button onClick={handleLinkNewFile} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
                        <Download className="w-4 h-4" /> Save As New File
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Always show import/export as fallback */}
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
                <Upload className="w-4 h-4" /> Import Excel
              </button>
              <button onClick={handleExport} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
                <Download className="w-4 h-4" /> Export Excel
              </button>

              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
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
