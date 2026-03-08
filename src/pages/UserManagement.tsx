import { useState } from 'react';
import { getUsers, saveUsers, AppUser, UserRole } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Save, Shield, Eye } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>(() => getUsers());
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', role: 'viewer' as UserRole });

  const handleSave = () => {
    saveUsers(users);
    toast.success('Users saved');
  };

  const handleAdd = () => {
    if (!newUser.username || !newUser.password || !newUser.fullName) {
      toast.error('Fill all fields');
      return;
    }
    if (users.some((u) => u.username === newUser.username)) {
      toast.error('Username already exists');
      return;
    }
    const updated = [...users, { ...newUser }];
    setUsers(updated);
    setNewUser({ username: '', password: '', fullName: '', role: 'viewer' });
  };

  const handleRemove = (username: string) => {
    if (username === 'admin') { toast.error('Cannot delete admin'); return; }
    setUsers(users.filter((u) => u.username !== username));
  };

  const handleRoleChange = (username: string, role: UserRole) => {
    if (username === 'admin') { toast.error('Cannot change admin role'); return; }
    setUsers(users.map((u) => (u.username === username ? { ...u, role } : u)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users and roles</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      <div className="card-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Username</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Full Name</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground w-40">Role</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-2 font-display font-medium flex items-center gap-2">
                  {u.role === 'admin' ? <Shield className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  {u.username}
                </td>
                <td className="py-3 px-2">{u.fullName}</td>
                <td className="py-3 px-2">
                  <Select value={u.role} onValueChange={(v) => handleRoleChange(u.username, v as UserRole)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3 px-2">
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(u.username)} className="text-muted-foreground hover:text-destructive" disabled={u.username === 'admin'}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add new user */}
        <div className="pt-4 mt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">Add User</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Username</Label>
              <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="username" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} placeholder="Full Name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
