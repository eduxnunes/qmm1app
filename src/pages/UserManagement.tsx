import { useState } from 'react';
import { getUsers, saveUsers, AppUser, UserRole, PagePermission, ALL_PAGES, DEFAULT_USER_PERMISSIONS } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Save, Shield, Eye, ChevronDown, ChevronRight } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>(() => getUsers());
  const [newUser, setNewUser] = useState<Omit<AppUser, 'permissions'> & { permissions: PagePermission[] }>({
    username: '', password: '', fullName: '', role: 'user', permissions: [...DEFAULT_USER_PERMISSIONS],
  });
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
    setUsers([...users, { ...newUser }]);
    setNewUser({ username: '', password: '', fullName: '', role: 'user', permissions: [...DEFAULT_USER_PERMISSIONS] });
  };

  const handleRemove = (username: string) => {
    if (username === 'admin') { toast.error('Cannot delete admin'); return; }
    setUsers(users.filter((u) => u.username !== username));
  };

  const handleRoleChange = (username: string, role: UserRole) => {
    if (username === 'admin') { toast.error('Cannot change admin role'); return; }
    setUsers(users.map((u) => (u.username === username ? { ...u, role } : u)));
  };

  const togglePermission = (username: string, perm: PagePermission) => {
    setUsers(users.map((u) => {
      if (u.username !== username || u.role === 'admin') return u;
      const has = u.permissions.includes(perm);
      return { ...u, permissions: has ? u.permissions.filter((p) => p !== perm) : [...u.permissions, perm] };
    }));
  };

  const toggleNewPermission = (perm: PagePermission) => {
    const has = newUser.permissions.includes(perm);
    setNewUser({
      ...newUser,
      permissions: has ? newUser.permissions.filter((p) => p !== perm) : [...newUser.permissions, perm],
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users, roles and page permissions</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      <div className="card-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground w-8"></th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Username</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Full Name</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground w-40">Role</th>
              <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground w-24">Pages</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <>
                <tr key={u.username} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2">
                    {u.role !== 'admin' && (
                      <button onClick={() => setExpandedUser(expandedUser === u.username ? null : u.username)} className="text-muted-foreground hover:text-foreground">
                        {expandedUser === u.username ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-2 font-display font-medium flex items-center gap-2">
                    {u.role === 'admin' ? <Shield className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    {u.username}
                  </td>
                  <td className="py-3 px-2">{u.fullName}</td>
                  <td className="py-3 px-2">
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.username, v as UserRole)} disabled={u.username === 'admin'}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-2 text-xs text-muted-foreground">
                    {u.role === 'admin' ? 'All' : `${u.permissions.length}/${ALL_PAGES.length}`}
                  </td>
                  <td className="py-3 px-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(u.username)} className="text-muted-foreground hover:text-destructive" disabled={u.username === 'admin'}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                {expandedUser === u.username && u.role !== 'admin' && (
                  <tr key={`${u.username}-perms`} className="border-b border-border/50">
                    <td></td>
                    <td colSpan={5} className="py-3 px-2">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Page Access</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {ALL_PAGES.map((page) => (
                            <label key={page.key} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={u.permissions.includes(page.key)}
                                onCheckedChange={() => togglePermission(u.username, page.key)}
                              />
                              <span className="text-sm">{page.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Add new user */}
        <div className="pt-4 mt-4 border-t border-border space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">Add User</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {newUser.role !== 'admin' && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Page Access</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_PAGES.map((page) => (
                  <label key={page.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={newUser.permissions.includes(page.key)}
                      onCheckedChange={() => toggleNewPermission(page.key)}
                    />
                    <span className="text-sm">{page.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>
    </div>
  );
}
