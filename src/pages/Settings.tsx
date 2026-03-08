import { useState, useRef, useCallback, useEffect } from 'react';
import { getSettings, saveSettings, AppSettings } from '@/lib/settings';
import { pickExcelFile, pickSaveLocation, getLinkedFileName, isAutoSaveActive, disconnectFile, autoSaveToExcel, importFromLinkedFile, isFileSystemSupported, exportToExcel } from '@/lib/excel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Plus, Trash2, Save, FileSpreadsheet, HardDrive, Unplug, Download, RefreshCw } from 'lucide-react';

type DropdownKey = 'auditTypes' | 'sections' | 'valueStreams' | 'statusOptions';

const SETTING_LABELS: Record<DropdownKey, string> = {
  auditTypes: 'Audit Types',
  sections: 'Sections',
  valueStreams: 'Value Streams',
  statusOptions: 'Status Options',
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [newItems, setNewItems] = useState<Record<DropdownKey, string>>({
    auditTypes: '', sections: '', valueStreams: '', statusOptions: '',
  });
  const [activeTab, setActiveTab] = useState<DropdownKey>('auditTypes');
  const [linkedFile, setLinkedFile] = useState<string | null>(getLinkedFileName());
  const [connected, setConnected] = useState(isAutoSaveActive());

  // Auto-save to Excel on localStorage changes
  useEffect(() => {
    if (!connected) return;
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (key.startsWith('isir_')) {
        clearTimeout((window as any).__autoSaveTimer);
        (window as any).__autoSaveTimer = setTimeout(() => {
          autoSaveToExcel();
        }, 500);
      }
    };
    return () => { localStorage.setItem = originalSetItem; };
  }, [connected]);

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Settings saved');
  };

  const handleAdd = (key: DropdownKey) => {
    const value = newItems[key].trim();
    if (!value) return;
    if (settings[key].includes(value)) { toast.error('Already exists'); return; }
    setSettings({ ...settings, [key]: [...settings[key], value] });
    setNewItems({ ...newItems, [key]: '' });
  };

  const handleRemove = (key: DropdownKey, item: string) => {
    setSettings({ ...settings, [key]: settings[key].filter((v) => v !== item) });
  };

  const handleLinkFile = async () => {
    const result = await pickExcelFile();
    if (result) {
      setLinkedFile(result.name);
      setConnected(true);
      try {
        const importResult = await importFromLinkedFile();
        if (importResult) {
          toast.success(`Linked to ${result.name} — loaded ${importResult.samples} samples`);
          window.location.reload();
        }
      } catch {
        toast.success(`Linked to ${result.name} — auto-save enabled`);
      }
    }
  };

  const handleNewFile = async () => {
    const result = await pickSaveLocation();
    if (result) {
      setLinkedFile(result.name);
      setConnected(true);
      await autoSaveToExcel();
      toast.success(`Created ${result.name} — auto-save enabled`);
    }
  };

  const handleDisconnect = () => {
    disconnectFile();
    setLinkedFile(null);
    setConnected(false);
    toast.info('Disconnected from Excel file');
  };

  const handleExportFallback = () => {
    exportToExcel();
    toast.success('Excel downloaded');
  };

  const tabs = Object.keys(SETTING_LABELS) as DropdownKey[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage dropdown options & Excel connection</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      {/* Excel File Connection */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Excel File</h2>
        </div>

        {connected && linkedFile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <FileSpreadsheet className="w-5 h-5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-sm text-success">{linkedFile}</p>
                <p className="text-xs text-success/70">Auto-save active — all changes save automatically</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => autoSaveToExcel().then(() => toast.success('Saved'))} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Save Now
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-2 text-destructive hover:text-destructive">
                <Unplug className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect an Excel file so all changes are saved automatically. You need to select the file once each session (browser security).
            </p>
            {isFileSystemSupported() ? (
              <div className="flex gap-2">
                <Button onClick={handleLinkFile} className="gap-2">
                  <HardDrive className="w-4 h-4" /> Open Existing Excel
                </Button>
                <Button variant="outline" onClick={handleNewFile} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Create New Excel
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-warning">
                    Direct file access requires <strong>Chrome or Edge</strong>. In this browser, use manual download instead.
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportFallback} className="gap-2">
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
              </div>
            )}
            {linkedFile && (
              <p className="text-xs text-muted-foreground">
                Previously linked: <span className="font-display text-foreground/70">{linkedFile}</span> — re-select to reconnect
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dropdown Editor Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-display font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {SETTING_LABELS[key]}
            <span className="ml-2 text-xs text-muted-foreground">({settings[key].length})</span>
          </button>
        ))}
      </div>

      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold">{SETTING_LABELS[activeTab]}</span>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {settings[activeTab].map((item) => (
            <div key={item} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <span className="text-sm">{item}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(activeTab, item)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-border">
          <Input
            value={newItems[activeTab]}
            onChange={(e) => setNewItems({ ...newItems, [activeTab]: e.target.value })}
            placeholder={`Add new ${SETTING_LABELS[activeTab].toLowerCase().slice(0, -1)}…`}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(activeTab)}
          />
          <Button variant="outline" onClick={() => handleAdd(activeTab)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
