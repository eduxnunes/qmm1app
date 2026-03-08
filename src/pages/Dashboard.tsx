import { useMemo } from 'react';
import { getSamples } from '@/lib/store';
import { getTargets } from '@/lib/store';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const samples = useMemo(() => getSamples(), []);
  const targets = useMemo(() => getTargets(), []);

  const totalSamples = samples.length;
  const okCount = samples.filter((s) => s.status === 'OK').length;
  const nokCount = samples.filter((s) => s.status === 'NOK').length;
  const pendingCount = samples.filter((s) => !s.status || s.status === 'Under Analysis').length;

  const stats = [
    { label: 'Total Samples', value: totalSamples, icon: ClipboardCheck, color: 'text-primary' },
    { label: 'Approved (OK)', value: okCount, icon: CheckCircle2, color: 'text-success' },
    { label: 'Rejected (NOK)', value: nokCount, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-warning' },
  ];

  const chartData = useMemo(() => {
    return targets.map((t) => {
      const actual = samples.filter((s) => s.auditType === t.auditType).length;
      return {
        name: t.auditType.length > 20 ? t.auditType.substring(0, 18) + '…' : t.auditType,
        target: t.target,
        actual,
      };
    });
  }, [samples, targets]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your audit samples</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`text-3xl font-display font-bold mt-2 animate-count-up ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Targets vs Actual</h2>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="target" name="Target" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--muted-foreground) / 0.3)" />
                ))}
              </Bar>
              <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.actual >= entry.target
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--primary))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent samples */}
      <div className="card-elevated">
        <h2 className="font-display font-semibold text-lg mb-4">Recent Samples</h2>
        {samples.length === 0 ? (
          <p className="text-muted-foreground text-sm">No samples yet. Create your first one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(-5).reverse().map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-display font-medium text-primary">{s.id}</td>
                    <td className="py-3 px-2 text-muted-foreground">{s.date}</td>
                    <td className="py-3 px-2">{s.auditType}</td>
                    <td className="py-3 px-2">{s.description}</td>
                    <td className="py-3 px-2">
                      {s.status ? (
                        <span className={s.status === 'OK' ? 'status-ok' : s.status === 'NOK' ? 'status-nok' : s.status === 'Cancelled' ? 'status-cancelled' : 'status-analysis'}>
                          {s.status}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
