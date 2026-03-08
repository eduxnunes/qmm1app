import { useState } from 'react';
import { getLinks, saveLinks, AppLink } from '@/lib/links';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link2, Plus, Trash2, Save, FolderOpen, Globe, FileText, ExternalLink, Pencil, Check, X } from 'lucide-react';

const CATEGORY_META: Record<AppLink['category'], { label: string; icon: React.ElementType; color: string }> = {
  network: { label: 'Network Paths', icon: FolderOpen, color: 'text-warning' },
  web: { label: 'Web URLs', icon: Globe, color: 'text-primary' },
  template: { label: 'Templates', icon: FileText, color: 'text-success' },
};

export default function Links() {
  const [links, setLinks] = useState<AppLink[]>(() => getLinks());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AppLink | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState<Omit<AppLink, 'id'>>({ label: '', category: 'web', url: '', description: '' });

  const handleSave = () => {
    saveLinks(links);
    toast.success('Links saved');
  };

  const handleAdd = () => {
    if (!newLink.label || !newLink.url) { toast.error('Label and URL are required'); return; }
    const id = newLink.label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    setLinks([...links, { ...newLink, id }]);
    setNewLink({ label: '', category: 'web', url: '', description: '' });
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const startEdit = (link: AppLink) => {
    setEditingId(link.id);
    setEditForm({ ...link });
  };

  const saveEdit = () => {
    if (!editForm) return;
    setLinks(links.map((l) => (l.id === editForm.id ? editForm : l)));
    setEditingId(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const categories = ['network', 'web', 'template'] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Links</h1>
          <p className="text-muted-foreground mt-1">Manage file paths and system URLs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Link
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save All
          </Button>
        </div>
      </div>

      {/* Add new link form */}
      {showAdd && (
        <div className="card-elevated space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-sm">New Link</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} placeholder="Link name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newLink.category} onValueChange={(v) => setNewLink({ ...newLink, category: v as AppLink['category'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Network Path</SelectItem>
                  <SelectItem value="web">Web URL</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL / Path</Label>
              <Input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="\\\\server\\path or https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={newLink.description} onChange={(e) => setNewLink({ ...newLink, description: e.target.value })} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm" className="gap-2">
              <Check className="w-3.5 h-3.5" /> Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="gap-2">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Links by category */}
      {categories.map((cat) => {
        const catLinks = links.filter((l) => l.category === cat);
        if (catLinks.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;

        return (
          <div key={cat} className="card-elevated">
            <div className="flex items-center gap-2 mb-4">
              <Icon className={`w-5 h-5 ${meta.color}`} />
              <h2 className="font-display font-semibold text-lg">{meta.label}</h2>
              <span className="text-xs text-muted-foreground">({catLinks.length})</span>
            </div>

            <div className="space-y-2">
              {catLinks.map((link) => (
                <div key={link.id} className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors">
                  {editingId === link.id && editForm ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">URL / Path</Label>
                          <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-display font-medium text-sm">{link.label}</span>
                        </div>
                        <p className="text-xs text-primary/80 font-mono mt-1 truncate">{link.url}</p>
                        {link.description && <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {link.category === 'web' && (
                          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => startEdit(link)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(link.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card-elevated bg-muted/30">
        <p className="text-xs text-muted-foreground font-display">
          <strong>Tip:</strong> For web URLs, use placeholders like <code className="text-primary">{'{softExpert}'}</code>, <code className="text-primary">{'{ecr}'}</code>, <code className="text-primary">{'{mdgm}'}</code>, <code className="text-primary">{'{problemSolving}'}</code> to auto-fill sample values when opening links from the Samples list.
        </p>
      </div>
    </div>
  );
}
