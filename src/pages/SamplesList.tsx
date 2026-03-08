import { useMemo, useState } from 'react';
import { getSamples, deleteSample } from '@/lib/store';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIT_TYPES, STATUS_OPTIONS } from '@/lib/types';
import { Search, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function SamplesList() {
  const [refresh, setRefresh] = useState(0);
  const samples = useMemo(() => getSamples(), [refresh]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      const matchSearch = !search || 
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.ttnr.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.auditType === typeFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [samples, search, typeFilter, statusFilter]);

  const handleDelete = (id: string) => {
    if (window.confirm(`Delete sample ${id}?`)) {
      deleteSample(id);
      setRefresh((r) => r + 1);
      toast.success(`Sample ${id} deleted`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Samples</h1>
        <p className="text-muted-foreground mt-1">{filtered.length} of {samples.length} samples</p>
      </div>

      {/* Filters */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, description, TTNR…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {AUDIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['ID', 'Date', 'Type', 'Section', 'TTNR', 'Description', 'Status', 'V.Stream', ''].map((h) => (
                <th key={h} className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground">No samples found</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2 font-display font-medium text-primary">{s.id}</td>
                  <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">{s.date}</td>
                  <td className="py-3 px-2 max-w-[180px] truncate">{s.auditType}</td>
                  <td className="py-3 px-2 max-w-[180px] truncate">{s.section}</td>
                  <td className="py-3 px-2 font-display text-xs">{s.ttnr}</td>
                  <td className="py-3 px-2 max-w-[200px] truncate">{s.description}</td>
                  <td className="py-3 px-2"><StatusBadge status={s.status} /></td>
                  <td className="py-3 px-2">{s.valueStream}</td>
                  <td className="py-3 px-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
