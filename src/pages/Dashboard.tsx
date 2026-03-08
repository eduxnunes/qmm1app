import { useMemo } from 'react';
import { getSamples, getTargets } from '@/lib/store';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, TrendingUp, BarChart3, PieChart as PieIcon, Activity, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const samples = useMemo(() => getSamples(), []);
  const targets = useMemo(() => getTargets(), []);

  const totalSamples = samples.length;
  const okCount = samples.filter((s) => s.status === 'OK').length;
  const nokCount = samples.filter((s) => s.status === 'NOK').length;
  const cancelledCount = samples.filter((s) => s.status === 'Cancelled').length;
  const underAnalysisCount = samples.filter((s) => s.status === 'Under Analysis').length;
  const pendingCount = samples.filter((s) => !s.status).length;

  const completionRate = totalSamples > 0 ? Math.round(((okCount + nokCount) / totalSamples) * 100) : 0;
  const approvalRate = (okCount + nokCount) > 0 ? Math.round((okCount / (okCount + nokCount)) * 100) : 0;

  // Decision time KPI: days between sample date and decisionDate
  const decisionTimeStats = useMemo(() => {
    const times: number[] = [];
    samples.forEach((s) => {
      if (s.date && s.decisionDate) {
        const start = new Date(s.date).getTime();
        const end = new Date(s.decisionDate).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          times.push(Math.round((end - start) / (1000 * 60 * 60 * 24)));
        }
      }
    });
    if (times.length === 0) return { avg: null, min: null, max: null, count: 0 };
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    return { avg, min: Math.min(...times), max: Math.max(...times), count: times.length };
  }, [samples]);

  // Samples still awaiting decision (have date but no decisionDate, and not cancelled)
  const awaitingDecision = samples.filter(
    (s) => s.date && !s.decisionDate && s.status !== 'Cancelled'
  );
  const overdueCount = awaitingDecision.filter((s) => {
    if (!s.dueDate) return false;
    return new Date(s.dueDate).getTime() < Date.now();
  }).length;

  // Decision time trend by month
  const decisionTimeTrend = useMemo(() => {
    const months: Record<string, { days: number[]; month: string }> = {};
    samples.forEach((s) => {
      if (s.date && s.decisionDate) {
        const start = new Date(s.date).getTime();
        const end = new Date(s.decisionDate).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
          const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
          if (!months[key]) months[key] = { days: [], month: key };
          months[key].days.push(days);
        }
      }
    });
    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        avg: Math.round(m.days.reduce((a, b) => a + b, 0) / m.days.length),
        min: Math.min(...m.days),
        max: Math.max(...m.days),
        count: m.days.length,
      }));
  }, [samples]);

  // Decision time distribution (histogram buckets)
  const decisionTimeDistribution = useMemo(() => {
    const buckets = [
      { label: '0 days', min: 0, max: 0, count: 0 },
      { label: '1-7 days', min: 1, max: 7, count: 0 },
      { label: '8-14 days', min: 8, max: 14, count: 0 },
      { label: '15-30 days', min: 15, max: 30, count: 0 },
      { label: '31-60 days', min: 31, max: 60, count: 0 },
      { label: '60+ days', min: 61, max: Infinity, count: 0 },
    ];
    samples.forEach((s) => {
      if (s.date && s.decisionDate) {
        const start = new Date(s.date).getTime();
        const end = new Date(s.decisionDate).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
          const bucket = buckets.find((b) => days >= b.min && days <= b.max);
          if (bucket) bucket.count++;
        }
      }
    });
    return buckets;
  }, [samples]);

  const stats = [
    { label: 'Total Samples', value: totalSamples, icon: ClipboardCheck, color: 'text-primary' },
    { label: 'Approved (OK)', value: okCount, icon: CheckCircle2, color: 'text-success' },
    { label: 'Rejected (NOK)', value: nokCount, icon: XCircle, color: 'text-destructive' },
    { label: 'Under Analysis', value: underAnalysisCount, icon: Clock, color: 'text-warning' },
    { label: 'Pending', value: pendingCount, icon: Activity, color: 'text-muted-foreground' },
    { label: 'Cancelled', value: cancelledCount, icon: XCircle, color: 'text-muted-foreground' },
  ];

  // Target vs Actual chart
  const targetData = useMemo(() => {
    return targets.map((t) => {
      const actual = samples.filter((s) => s.auditType === t.auditType).length;
      return {
        name: t.auditType.length > 20 ? t.auditType.substring(0, 18) + '…' : t.auditType,
        target: t.target,
        actual,
      };
    });
  }, [samples, targets]);

  // Status distribution pie
  const statusPieData = useMemo(() => [
    { name: 'OK', value: okCount, fill: 'hsl(var(--success))' },
    { name: 'NOK', value: nokCount, fill: 'hsl(var(--destructive))' },
    { name: 'Under Analysis', value: underAnalysisCount, fill: 'hsl(var(--warning))' },
    { name: 'Cancelled', value: cancelledCount, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Pending', value: pendingCount, fill: 'hsl(var(--border))' },
  ].filter((d) => d.value > 0), [okCount, nokCount, underAnalysisCount, cancelledCount, pendingCount]);

  // By Value Stream
  const valueStreamData = useMemo(() => {
    const streams = [...new Set(samples.map((s) => s.valueStream).filter(Boolean))];
    return streams.map((vs) => {
      const vsSamples = samples.filter((s) => s.valueStream === vs);
      return {
        name: vs,
        total: vsSamples.length,
        ok: vsSamples.filter((s) => s.status === 'OK').length,
        nok: vsSamples.filter((s) => s.status === 'NOK').length,
        underAnalysis: vsSamples.filter((s) => s.status === 'Under Analysis').length,
      };
    });
  }, [samples]);

  // Monthly trend
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; total: number; ok: number; nok: number; underAnalysis: number }> = {};
    samples.forEach((s) => {
      const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: key, total: 0, ok: 0, nok: 0, underAnalysis: 0 };
      months[key].total++;
      if (s.status === 'OK') months[key].ok++;
      if (s.status === 'NOK') months[key].nok++;
      if (s.status === 'Under Analysis') months[key].underAnalysis++;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [samples]);

  // By Audit Type
  const auditTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    samples.forEach((s) => { types[s.auditType] = (types[s.auditType] || 0) + 1; });
    return Object.entries(types)
      .map(([name, value]) => ({ name: name.length > 22 ? name.substring(0, 20) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [samples]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your audit samples</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`text-2xl font-display font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* KPI rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-elevated">
          <p className="text-sm text-muted-foreground font-medium">Completion Rate</p>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-4xl font-display font-bold text-primary">{completionRate}%</span>
            <span className="text-xs text-muted-foreground mb-1">of samples have a final decision</span>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="card-elevated">
          <p className="text-sm text-muted-foreground font-medium">Approval Rate</p>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-4xl font-display font-bold text-success">{approvalRate}%</span>
            <span className="text-xs text-muted-foreground mb-1">of decided samples are OK</span>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${approvalRate}%` }} />
          </div>
        </div>
      </div>

      {/* Decision Time KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Avg. Decision Time</p>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-display font-bold text-primary">
              {decisionTimeStats.avg !== null ? decisionTimeStats.avg : '—'}
            </span>
            {decisionTimeStats.avg !== null && (
              <span className="text-sm text-muted-foreground mb-1">days</span>
            )}
          </div>
          {decisionTimeStats.count > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Based on {decisionTimeStats.count} sample{decisionTimeStats.count !== 1 ? 's' : ''} · Min: {decisionTimeStats.min}d · Max: {decisionTimeStats.max}d
            </p>
          )}
        </div>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <p className="text-sm text-muted-foreground font-medium">Under Analysis</p>
          </div>
          <span className="text-4xl font-display font-bold text-warning">{underAnalysisCount}</span>
          <p className="text-xs text-muted-foreground mt-2">
            samples currently being analyzed
          </p>
        </div>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">Awaiting Decision</p>
          </div>
          <span className="text-4xl font-display font-bold text-muted-foreground">{awaitingDecision.length}</span>
          <p className="text-xs text-muted-foreground mt-2">
            samples without a decision date
          </p>
        </div>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-muted-foreground font-medium">Overdue</p>
          </div>
          <span className="text-4xl font-display font-bold text-destructive">{overdueCount}</span>
          <p className="text-xs text-muted-foreground mt-2">
            past due date without decision
          </p>
        </div>
      </div>

      {/* Decision Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Timer className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Decision Time Trend</h2>
          </div>
          <div className="h-64">
            {decisionTimeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={decisionTimeTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                    formatter={(value: number, name: string) => [`${value} days`, name === 'avg' ? 'Average' : name === 'min' ? 'Min' : name === 'max' ? 'Max' : name]}
                  />
                  <Line type="monotone" dataKey="avg" name="Average" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="min" name="Min" stroke="hsl(var(--success))" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="max" name="Max" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No decision data yet</div>
            )}
          </div>
        </div>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Decision Time Distribution</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decisionTimeDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                <Bar dataKey="count" name="Samples" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {decisionTimeDistribution.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--primary) / ${0.4 + i * 0.12})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 1: Target vs Actual + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Targets vs Actual</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} height={80} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                <Bar dataKey="target" name="Target" radius={[4, 4, 0, 0]}>
                  {targetData.map((_, i) => <Cell key={i} fill="hsl(var(--muted-foreground) / 0.3)" />)}
                </Bar>
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                  {targetData.map((entry, i) => (
                    <Cell key={i} fill={entry.actual >= entry.target ? 'hsl(var(--success))' : 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Status Distribution</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2: Value Stream + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">By Value Stream</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueStreamData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                <Bar dataKey="ok" name="OK" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="nok" name="NOK" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="underAnalysis" name="Under Analysis" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} stackId="a" />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Monthly Trend</h2>
          </div>
          <div className="h-64">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ok" name="OK" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nok" name="NOK" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Audit Types */}
      <div className="card-elevated">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Top Audit Types</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={auditTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={115} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
              <Bar dataKey="value" name="Count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                {auditTypeData.map((_, i) => <Cell key={i} fill={`hsl(var(--primary) / ${0.5 + (i * 0.05)})`} />)}
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
                  {['ID', 'Date', 'Type', 'Description', 'Status'].map((h) => (
                    <th key={h} className="text-left py-3 px-2 font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
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
