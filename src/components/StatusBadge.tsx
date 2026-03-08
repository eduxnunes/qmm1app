import { AuditSample } from '@/lib/types';

export function StatusBadge({ status }: { status: AuditSample['status'] }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  
  const classMap: Record<string, string> = {
    OK: 'status-ok',
    NOK: 'status-nok',
    Cancelled: 'status-cancelled',
    'Under Analysis': 'status-analysis',
  };

  return <span className={classMap[status] || 'status-cancelled'}>{status}</span>;
}
