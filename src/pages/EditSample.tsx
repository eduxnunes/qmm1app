import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSamples, saveSample, deleteSample } from '@/lib/store';
import { autoSaveToExcel, isAutoSaveActive } from '@/lib/excel';
import { AuditSample } from '@/lib/types';
import { getSettings } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';
import { MultiTtnrInput } from '@/components/MultiTtnrInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';

export default function EditSample() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = getSettings();

  const [form, setForm] = useState<AuditSample | null>(null);

  useEffect(() => {
    const samples = getSamples();
    const sample = samples.find((s) => s.id === id);
    if (sample) {
      setForm(sample);
    } else {
      toast.error('Sample not found');
      navigate('/samples');
    }
  }, [id, navigate]);

  if (!form) return null;

  const update = (field: string, value: string | number) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = () => {
    if (!form.auditType || !form.section) {
      toast.error('Audit Type and Section are required');
      return;
    }
    saveSample(form);
    toast.success(`Sample ${form.id} updated`);
    navigate('/samples');
  };

  const handleDelete = () => {
    if (window.confirm(`Delete sample ${form.id}?`)) {
      deleteSample(form.id);
      toast.success(`Sample ${form.id} deleted`);
      navigate('/samples');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/samples')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Edit Sample</h1>
          <p className="text-muted-foreground mt-1">ID: <span className="font-display text-primary">{form.id}</span></p>
        </div>
      </div>

      <div className="card-elevated space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => {
              const d = new Date(e.target.value);
              update('date', e.target.value);
              update('day', d.getDate());
              update('month', d.getMonth() + 1);
              update('year', d.getFullYear());
            }} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Audit Type *</Label>
            <Select value={form.auditType} onValueChange={(v) => update('auditType', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {settings.auditTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Section *</Label>
            <Select value={form.section} onValueChange={(v) => update('section', v)}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {settings.sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Value Stream</Label>
            <Select value={form.valueStream} onValueChange={(v) => update('valueStream', v)}>
              <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
              <SelectContent>
                {settings.valueStreams.map((vs) => <SelectItem key={vs} value={vs}>{vs}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">TTNR(s)</Label>
            <MultiTtnrInput value={form.ttnr} onChange={(v) => update('ttnr', v)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Description</Label>
            <Input value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Status</Label>
            <Select value={form.status || '_none'} onValueChange={(v) => update('status', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {settings.statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Decision Date</Label>
            <Input type="date" value={form.decisionDate} onChange={(e) => update('decisionDate', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">MDGM</Label>
            <Input value={form.mdgm} onChange={(e) => update('mdgm', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">ECR</Label>
            <Input value={form.ecr} onChange={(e) => update('ecr', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">SoftExpert</Label>
            <Input value={form.softExpert} onChange={(e) => update('softExpert', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Problem Solving</Label>
            <Input value={form.problemSolving} onChange={(e) => update('problemSolving', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Comments</Label>
            <Input value={form.comments} onChange={(e) => update('comments', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-border">
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
          <Button variant="outline" onClick={handleDelete} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" /> Delete Sample
          </Button>
        </div>
      </div>
    </div>
  );
}
