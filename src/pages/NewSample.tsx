import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSample, getNextId } from '@/lib/store';
import { AuditSample } from '@/lib/types';
import { getSettings } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';
import { isFolderConnected, createSampleFolders } from '@/lib/folderManager';
import { autoSaveToExcel, isAutoSaveActive } from '@/lib/excel';
import { MultiTtnrInput } from '@/components/MultiTtnrInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';

export default function NewSample() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = getSettings();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [form, setForm] = useState<Partial<AuditSample>>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
    date: todayStr,
    dueDate: todayStr,
    auditType: '',
    section: '',
    valueStream: '',
    ttnr: '',
    description: '',
    comments: '',
    status: '',
    decisionDate: '',
    mdgm: '',
    ecr: '',
    softExpert: '',
    problemSolving: '',
    user: user?.username || 'admin',
  });

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.auditType || !form.section) {
      toast.error('Please fill in Audit Type and Section');
      return;
    }
    const id = getNextId(form.year || today.getFullYear());
    const sample: AuditSample = {
      id,
      day: form.day || today.getDate(),
      month: form.month || today.getMonth() + 1,
      year: form.year || today.getFullYear(),
      auditType: form.auditType || '',
      section: form.section || '',
      valueStream: form.valueStream || '',
      ttnr: form.ttnr || '',
      description: form.description || '',
      comments: form.comments || '',
      status: (form.status as AuditSample['status']) || '',
      dueDate: form.dueDate || todayStr,
      decisionDate: form.decisionDate || '',
      mdgm: form.mdgm || '',
      ecr: form.ecr || '',
      softExpert: form.softExpert || '',
      problemSolving: form.problemSolving || '',
      date: form.date || todayStr,
      user: user?.username || 'admin',
    };
    saveSample(sample);

    // Create folder structure if root folder is connected
    if (isFolderConnected()) {
      const created = await createSampleFolders(id, sample.ttnr);
      if (created) {
        toast.success(`Sample ${id} created — folder structure created`);
      } else {
        toast.success(`Sample ${id} created (folder creation failed)`);
      }
    } else {
      toast.success(`Sample ${id} created successfully`);
    }
    navigate('/samples');
  };

  const handleReset = () => {
    setForm({
      year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(),
      date: todayStr, dueDate: todayStr, auditType: '', section: '', valueStream: '',
      ttnr: '', description: '', comments: '', status: '', decisionDate: '',
      mdgm: '', ecr: '', softExpert: '', problemSolving: '', user: user?.username || 'admin',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">New Sample</h1>
        <p className="text-muted-foreground mt-1">Register a new audit sample</p>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated space-y-6">
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
            <MultiTtnrInput value={form.ttnr || ''} onChange={(v) => update('ttnr', v)} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Description</Label>
            <Input value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Part description" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Status</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
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
            <Input value={form.mdgm} onChange={(e) => update('mdgm', e.target.value)} placeholder="MDGM number" />
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

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" className="gap-2">
            <Save className="w-4 h-4" /> Save Sample
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
