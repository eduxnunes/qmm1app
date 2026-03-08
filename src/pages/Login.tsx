import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success('Welcome back!');
    } else {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">ISIR Tracker</h1>
          <p className="text-muted-foreground text-sm">Sign in to access the audit system</p>
        </div>

        <form onSubmit={handleSubmit} className="card-elevated space-y-5">
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs uppercase tracking-wider">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          <Button type="submit" className="w-full gap-2">
            <LogIn className="w-4 h-4" /> Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Default: <span className="font-display text-foreground/70">admin / admin123</span>
        </p>
      </div>
    </div>
  );
}
