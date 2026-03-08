import * as XLSX from 'xlsx';
import { AuditSample } from './types';
import { AuditTarget } from './types';
import { AppUser, UserRole, PagePermission, DEFAULT_USER_PERMISSIONS, ADMIN_PERMISSIONS } from './auth';
import { getSamples, saveSample, getTargets, saveTargets } from './store';
import { getUsers, saveUsers } from './auth';

/** Parse date string in DD/MM/YYYY or YYYY-MM-DD format */
function parseDate(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // Excel serial number
  if (!isNaN(Number(s))) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  return s;
}

export interface ImportResult {
  samples: number;
  targets: number;
  users: number;
  errors: string[];
}

export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const result: ImportResult = { samples: 0, targets: 0, users: 0, errors: [] };

        // Page 2: Samples (main data)
        const samplesSheet = wb.Sheets[wb.SheetNames[1]];
        if (samplesSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(samplesSheet, { defval: '' });
          rows.forEach((row, i) => {
            try {
              const id = String(row['ID'] || '').trim();
              if (!id) return;
              const sample: AuditSample = {
                id,
                day: Number(row['Day']) || 1,
                month: Number(row['Month']) || 1,
                year: Number(row['Year']) || new Date().getFullYear(),
                auditType: String(row['Audit Type'] || ''),
                section: String(row['Section'] || ''),
                valueStream: String(row['Value Stream'] || ''),
                ttnr: String(row['TTNR'] || ''),
                description: String(row['Description'] || ''),
                comments: String(row['Comments'] || ''),
                status: (String(row['OK/NOK'] || '') as AuditSample['status']) || '',
                dueDate: parseDate(row['Due Date']),
                decisionDate: parseDate(row['Decision Date']),
                mdgm: String(row['MDGM'] || ''),
                ecr: String(row['ECR'] || ''),
                softExpert: String(row['SoftExpert'] || ''),
                problemSolving: String(row['Problem Solving'] || ''),
                date: parseDate(row['Date']),
                user: String(row['User'] || 'admin'),
              };
              saveSample(sample);
              result.samples++;
            } catch {
              result.errors.push(`Row ${i + 2}: failed to parse sample`);
            }
          });
        }

        // Page 3: Targets
        const targetsSheet = wb.Sheets[wb.SheetNames[2]];
        if (targetsSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(targetsSheet, { defval: '' });
          const targets: AuditTarget[] = [];
          rows.forEach((row) => {
            const auditType = String(row['Audit Type'] || '').trim();
            const target = Number(row['Target']) || 0;
            if (auditType) {
              targets.push({ auditType, target });
              result.targets++;
            }
          });
          if (targets.length > 0) saveTargets(targets);
        }

        // Page 4: Users
        const usersSheet = wb.Sheets[wb.SheetNames[3]];
        if (usersSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(usersSheet, { defval: '', header: ['username', 'passwordHash', 'role', 'permissions'] });
          // Skip header row
          const existingUsers = getUsers();
          rows.slice(1).forEach((row) => {
            const username = String(row['username'] || '').trim();
            if (!username) return;
            // Check if user already exists
            if (existingUsers.some((u) => u.username === username)) return;
            const role = String(row['role'] || 'user') as UserRole;
            const permsStr = String(row['permissions'] || '');
            const permMap: Record<string, PagePermission> = {
              new_sample: 'new_sample', edit_sample: 'samples', settings: 'settings',
              graphics: 'dashboard', user_mgmt: 'users', edit_target: 'targets',
            };
            const permissions: PagePermission[] = role === 'admin'
              ? ADMIN_PERMISSIONS
              : permsStr.split(',').map((p) => permMap[p.trim()]).filter(Boolean) as PagePermission[];

            existingUsers.push({
              username,
              password: username.toLowerCase(), // Default password = username (since we can't use bcrypt hashes)
              role: role === 'admin' ? 'admin' : 'user',
              fullName: username,
              permissions: permissions.length > 0 ? permissions : DEFAULT_USER_PERMISSIONS,
            });
            result.users++;
          });
          if (result.users > 0) saveUsers(existingUsers);
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportToExcel(): void {
  const wb = XLSX.utils.book_new();

  // Page 1: Config (Audit Types, Sections, etc.) — from settings
  const settingsData = localStorage.getItem('isir_settings');
  if (settingsData) {
    const settings = JSON.parse(settingsData);
    const maxLen = Math.max(
      settings.auditTypes?.length || 0,
      settings.sections?.length || 0,
      (settings.statusOptions?.length || 0),
      (settings.valueStreams?.length || 0),
    );
    const configRows: Record<string, string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      configRows.push({
        'Audit Type': settings.auditTypes?.[i] || '',
        'Section': settings.sections?.[i] || '',
        'OK/NOK': settings.statusOptions?.[i] || '',
        'Value Stream': settings.valueStreams?.[i] || '',
      });
    }
    const ws1 = XLSX.utils.json_to_sheet(configRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Config');
  }

  // Page 2: Samples
  const samples = getSamples();
  const sampleRows = samples.map((s) => ({
    'ID': s.id,
    'Day': s.day,
    'Month': s.month,
    'Year': s.year,
    'Audit Type': s.auditType,
    'Section': s.section,
    'Value Stream': s.valueStream,
    'TTNR': s.ttnr,
    'Description': s.description,
    'Comments': s.comments,
    'OK/NOK': s.status,
    'Due Date': s.dueDate,
    'Decision Date': s.decisionDate,
    'MDGM': s.mdgm,
    'ECR': s.ecr,
    'SoftExpert': s.softExpert,
    'Problem Solving': s.problemSolving,
    'Date': s.date,
    'User': s.user,
  }));
  const ws2 = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Samples');

  // Page 3: Targets
  const targets = getTargets();
  const targetRows = targets.map((t) => ({
    'Audit Type': t.auditType,
    'Target': t.target,
  }));
  const ws3 = XLSX.utils.json_to_sheet(targetRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Targets');

  // Page 4: Users
  const users = getUsers();
  const permMap: Record<PagePermission, string> = {
    new_sample: 'new_sample', samples: 'edit_sample', settings: 'settings',
    dashboard: 'graphics', users: 'user_mgmt', targets: 'edit_target', links: 'links',
  };
  const userRows = users.map((u) => ({
    'Username': u.username,
    'Password_Hash': '(stored locally)',
    'Role': u.role,
    'Permissions': u.permissions.map((p) => permMap[p] || p).join(','),
  }));
  const ws4 = XLSX.utils.json_to_sheet(userRows);
  XLSX.utils.book_append_sheet(wb, ws4, 'Users');

  // Download
  const fileName = `ISIR_Database_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
