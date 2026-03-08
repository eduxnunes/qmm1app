import { useState } from 'react';
import { getSettings, saveSettings, AppSettings } from '@/lib/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Plus, Trash2, Save } from 'lucide-react';

type SettingsKey = keyof AppSettings;

const SETTING_LABELS: Record<SettingsKey, string> = {
  auditTypes: 'Audit Types',
  sections: 'Sections',
  valueStreams: 'Value Streams',
  statusOptions: 'Status Options',
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [newItems, setNewItems] = useState<Record<SettingsKey, string>>({
    auditTypes: '', sections: '', valueStreams: '', statusOptions: '',
  });
  const [activeTab, setActiveTab] = useState<SettingsKey>('auditTypes');

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Settings saved');
  };

  const handleAdd = (key: SettingsKey) => {
    const value = newItems[key].trim();
    if (!value) return;
    if (settings[key].includes(value)) { toast.error('Already exists'); return; }
    setSettings({ ...settings, [key]: [...settings[key], value] });
    setNewItems({ ...newItems, [key]: '' });
  };

  const handleRemove = (key: SettingsKey, item: string) => {
    setSettings({ ...settings, [key]: settings[key].filter((v) => v !== item) });
  };

  const tabs = Object.keys(SETTING_LABELS) as SettingsKey[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage dropdown options</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      {/* Tabs */}
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

      {/* Active tab content */}
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
