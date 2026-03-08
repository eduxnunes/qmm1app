import { useState, useMemo } from 'react';
import { getTargets, saveTargets } from '@/lib/store';
import { AuditTarget } from '@/lib/types';
import { getSettings } from '@/lib/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Target, Plus, Trash2, Save } from 'lucide-react';

export default function Targets() {
  const [targets, setTargets] = useState<AuditTarget[]>(() => getTargets());
  const [newType, setNewType] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const usedTypes = useMemo(() => targets.map((t) => t.auditType), [targets]);
  const availableTypes = AUDIT_TYPES.filter((t) => !usedTypes.includes(t));

  const handleSave = () => {
    saveTargets(targets);
    toast.success('Targets saved successfully');
  };

  const handleAdd = () => {
    if (!newType || !newTarget) return;
    const updated = [...targets, { auditType: newType, target: parseInt(newTarget, 10) }];
    setTargets(updated);
    setNewType('');
    setNewTarget('');
  };

  const handleRemove = (type: string) => {
    setTargets(targets.filter((t) => t.auditType !== type));
  };

  const handleUpdate = (type: string, value: number) => {
    setTargets(targets.map((t) => (t.auditType === type ? { ...t, target: value } : t)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Targets</h1>
          <p className="text-muted-foreground mt-1">Monthly audit targets by type</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      <div className="card-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Audit Type</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground w-32">Target</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.auditType} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {t.auditType}
                </td>
                <td className="py-3 px-2">
                  <Input
                    type="number"
                    min={0}
                    value={t.target}
                    onChange={(e) => handleUpdate(t.auditType, parseInt(e.target.value, 10) || 0)}
                    className="w-24 font-display"
                  />
                </td>
                <td className="py-3 px-2">
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(t.auditType)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add new */}
        {availableTypes.length > 0 && (
          <div className="flex items-end gap-3 pt-4 mt-4 border-t border-border">
            <div className="flex-1">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue placeholder="Add audit type…" /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              min={0}
              placeholder="Target"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-24 font-display"
            />
            <Button variant="outline" onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
