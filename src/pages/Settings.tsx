import { useState, useEffect } from 'react';
import { getSettings, saveSettings, AppSettings } from '@/lib/settings';
import { pickExcelFile, pickSaveLocation, getLinkedFileName, isAutoSaveActive, disconnectFile, autoSaveToExcel, importFromLinkedFile, isFileSystemSupported as isExcelFSSupported, exportToExcel, restoreFileHandle } from '@/lib/excel';
import {
  pickConfigFile, createConfigFile, getConfigFileName, isConfigConnected,
  disconnectConfigFile, autoSaveConfig, restoreConfigHandle, loadConfigFromFile,
  isFileSystemSupported as isConfigFSSupported,
} from '@/lib/configFile';
import {
  pickRootFolder, getRootFolderName, isFolderConnected,
  disconnectRootFolder, restoreRootFolder, isFSSupported as isFolderFSSupported,
} from '@/lib/folderManager';
import { saveTargets } from '@/lib/store';
import { saveLinks } from '@/lib/links';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Plus, Trash2, Save, FileSpreadsheet, HardDrive, Unplug, Download, RefreshCw, FileText, FolderOpen } from 'lucide-react';

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

  // Config file state
  const [configFile, setConfigFile] = useState<string | null>(getConfigFileName());
  const [configOk, setConfigOk] = useState(isConfigConnected());

  // Folder state
  const [rootFolder, setRootFolder] = useState<string | null>(getRootFolderName());
  const [folderOk, setFolderOk] = useState(isFolderConnected());

  // Auto-restore Excel handle
  useEffect(() => {
    if (!connected && getLinkedFileName()) {
      restoreFileHandle().then((ok) => {
        if (ok) { setConnected(true); setLinkedFile(getLinkedFileName()); }
      });
    }
  }, []);

  // Auto-restore config handle
  useEffect(() => {
    if (!configOk && getConfigFileName()) {
      restoreConfigHandle().then((ok) => {
        if (ok) { setConfigOk(true); setConfigFile(getConfigFileName()); }
      });
    }
  }, []);

  // Auto-restore root folder handle
  useEffect(() => {
    if (!folderOk && getRootFolderName()) {
      restoreRootFolder().then((ok) => {
        if (ok) { setFolderOk(true); setRootFolder(getRootFolderName()); }
      });
    }
  }, []);

  // Auto-save to Excel on localStorage changes
  useEffect(() => {
    if (!connected) return;
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (key.startsWith('isir_')) {
        clearTimeout((window as any).__autoSaveTimer);
        (window as any).__autoSaveTimer = setTimeout(() => { autoSaveToExcel(); }, 500);
      }
    };
    return () => { localStorage.setItem = originalSetItem; };
  }, [connected]);

  // Auto-save config on localStorage changes (settings/targets/links)
  useEffect(() => {
    if (!configOk) return;
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (key === 'isir_settings' || key === 'isir_targets' || key === 'isir_links') {
        clearTimeout((window as any).__configSaveTimer);
        (window as any).__configSaveTimer = setTimeout(() => { autoSaveConfig(); }, 500);
      }
    };
    return () => { localStorage.setItem = originalSetItem; };
  }, [configOk]);

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

  // Excel handlers
  const handleLinkFile = async () => {
    const result = await pickExcelFile();
    if (result) {
      setLinkedFile(result.name); setConnected(true);
      try {
        const importResult = await importFromLinkedFile();
        if (importResult) {
          toast.success(`Linked to ${result.name} — loaded ${importResult.samples} samples`);
          window.location.reload();
        }
      } catch { toast.success(`Linked to ${result.name} — auto-save enabled`); }
    }
  };

  const handleNewFile = async () => {
    const result = await pickSaveLocation();
    if (result) {
      setLinkedFile(result.name); setConnected(true);
      await autoSaveToExcel();
      toast.success(`Created ${result.name} — auto-save enabled`);
    }
  };

  const handleDisconnect = () => {
    disconnectFile(); setLinkedFile(null); setConnected(false);
    toast.info('Disconnected from Excel file');
  };

  const handleExportFallback = () => { exportToExcel(); toast.success('Excel downloaded'); };

  // Config file handlers
  const handlePickConfig = async () => {
    const result = await pickConfigFile();
    if (result) {
      setConfigFile(result.name); setConfigOk(true);
      const data = await loadConfigFromFile();
      if (data) {
        saveSettings(data.settings);
        saveTargets(data.targets);
        saveLinks(data.links);
        setSettings(data.settings);
        toast.success(`Loaded config from ${result.name}`);
      } else {
        // New/empty file — save current data
        await autoSaveConfig();
        toast.success(`Linked to ${result.name}`);
      }
    }
  };

  const handleCreateConfig = async () => {
    const result = await createConfigFile();
    if (result) {
      setConfigFile(result.name); setConfigOk(true);
      await autoSaveConfig();
      toast.success(`Created ${result.name} — auto-save enabled`);
    }
  };

  const handleDisconnectConfig = () => {
    disconnectConfigFile(); setConfigFile(null); setConfigOk(false);
    toast.info('Disconnected from config file');
  };

  // Folder handlers
  const handlePickFolder = async () => {
    const result = await pickRootFolder();
    if (result) {
      setRootFolder(result.name); setFolderOk(true);
      toast.success(`Root folder set to "${result.name}"`);
    }
  };

  const handleDisconnectFolder = () => {
    disconnectRootFolder(); setRootFolder(null); setFolderOk(false);
    toast.info('Disconnected from root folder');
  };

  const tabs = Object.keys(SETTING_LABELS) as DropdownKey[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage dropdown options, config & Excel connection</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      {/* Config File Connection */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Config File (Settings, Targets & Links)</h2>
        </div>

        {configOk && configFile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <FileText className="w-5 h-5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-sm text-success">{configFile}</p>
                <p className="text-xs text-success/70">Auto-save active — settings, targets & links sync automatically</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => autoSaveConfig().then(() => toast.success('Config saved'))} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Save Now
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnectConfig} className="gap-2 text-destructive hover:text-destructive">
                <Unplug className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!isConfigFSSupported() ? (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning">
                  Direct file access requires <strong>Chrome or Edge</strong> (not inside an iframe). Publish your app first, then use this feature.
                </p>
              </div>
            ) : (
              <>
                {configFile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-medium text-sm">{configFile}</p>
                      <p className="text-xs text-muted-foreground">Previously linked — click below to reconnect</p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {configFile ? 'Re-select the file to reconnect.' : 'Connect a JSON file to persist settings, targets & links automatically.'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handlePickConfig} className="gap-2">
                    <HardDrive className="w-4 h-4" /> {configFile ? 'Reconnect Config' : 'Open Existing Config'}
                  </Button>
                  <Button variant="outline" onClick={handleCreateConfig} className="gap-2">
                    <FileText className="w-4 h-4" /> Create New Config
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Excel File Connection */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Excel File (Samples Data)</h2>
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
            {!isExcelFSSupported() ? (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-warning">
                    Direct file access requires <strong>Chrome or Edge</strong> (not inside an iframe). Publish your app first.
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportFallback} className="gap-2">
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
              </div>
            ) : (
              <>
                {linkedFile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-medium text-sm">{linkedFile}</p>
                      <p className="text-xs text-muted-foreground">Previously linked — click below to reconnect</p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {linkedFile ? 'Re-select the file to reconnect.' : 'Connect an Excel file so sample changes save automatically.'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleLinkFile} className="gap-2">
                    <HardDrive className="w-4 h-4" /> {linkedFile ? 'Reconnect Excel' : 'Open Existing Excel'}
                  </Button>
                  <Button variant="outline" onClick={handleNewFile} className="gap-2">
                    <FileSpreadsheet className="w-4 h-4" /> Create New Excel
                  </Button>
                </div>
              </>
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
