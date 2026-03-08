import * as XLSX from '@e965/xlsx';
import { AuditSample } from './types';
import { AuditTarget } from './types';
import { AppUser, UserRole, PagePermission, DEFAULT_USER_PERMISSIONS, ADMIN_PERMISSIONS } from './auth';
import { getSamples, saveSample, getTargets, saveTargets } from './store';
import { getUsers, saveUsers } from './auth';

// ── File System Access API handle ──────────────────────────────
let fileHandle: FileSystemFileHandle | null = null;
let autoSaveEnabled = false;

const IDB_NAME = 'isir_excel_db';
const IDB_STORE = 'fileHandles';
const IDB_KEY = 'excelHandle';

/** IndexedDB helpers to persist the file handle across sessions */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToIDB(handle: FileSystemFileHandle): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getHandleFromIDB(): Promise<FileSystemFileHandle | null> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, 'readonly');
  const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function removeHandleFromIDB(): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).delete(IDB_KEY);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

/** Check if File System Access API is supported */
export function isFileSystemSupported(): boolean {
  return 'showOpenFilePicker' in window;
}

/** Try to restore the previously linked file handle from IndexedDB */
export async function restoreFileHandle(): Promise<boolean> {
  if (!isFileSystemSupported()) return false;
  try {
    const handle = await getHandleFromIDB();
    if (!handle) return false;
    // Request permission (may show a one-click prompt)
    const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      fileHandle = handle;
      autoSaveEnabled = true;
      localStorage.setItem('isir_excel_filename', handle.name);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Pick an Excel file and store the handle for future writes */
export async function pickExcelFile(): Promise<{ handle: FileSystemFileHandle; name: string } | null> {
  if (!isFileSystemSupported()) return null;
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      multiple: false,
    });
    fileHandle = handle;
    autoSaveEnabled = true;
    localStorage.setItem('isir_excel_filename', handle.name);
    await saveHandleToIDB(handle);
    return { handle, name: handle.name };
  } catch {
    return null; // User cancelled
  }
}

/** Pick a NEW file location (Save As) */
export async function pickSaveLocation(): Promise<{ handle: FileSystemFileHandle; name: string } | null> {
  if (!isFileSystemSupported()) return null;
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `ISIR_Database_${new Date().toISOString().split('T')[0]}.xlsx`,
      types: [{ description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
    });
    fileHandle = handle;
    autoSaveEnabled = true;
    localStorage.setItem('isir_excel_filename', handle.name);
    await saveHandleToIDB(handle);
    return { handle, name: handle.name };
  } catch {
    return null;
  }
}

export function getLinkedFileName(): string | null {
  return localStorage.getItem('isir_excel_filename');
}

export function isAutoSaveActive(): boolean {
  return autoSaveEnabled && fileHandle !== null;
}

export function disconnectFile(): void {
  fileHandle = null;
  autoSaveEnabled = false;
  localStorage.removeItem('isir_excel_filename');
  removeHandleFromIDB();
}

/** Write the current data directly to the linked file handle */
async function writeToFileHandle(): Promise<void> {
  if (!fileHandle) return;
  const wb = buildWorkbook();
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(new Uint8Array(wbout));
  await writable.close();
}

/** Auto-save to the linked Excel file (call after any data change) */
export async function autoSaveToExcel(): Promise<boolean> {
  if (!autoSaveEnabled || !fileHandle) return false;
  try {
    await writeToFileHandle();
    return true;
  } catch (err) {
    console.error('Auto-save failed:', err);
    // Permission may have been revoked
    return false;
  }
}

/** Import from the linked file handle */
export async function importFromLinkedFile(): Promise<ImportResult | null> {
  if (!fileHandle) return null;
  const file = await fileHandle.getFile();
  return importFromExcel(file);
}

// ── Parse / Build helpers ──────────────────────────────────────

function parseDate(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
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

        // Page 2: Samples
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
          const existingUsers = getUsers();
          rows.slice(1).forEach((row) => {
            const username = String(row['username'] || '').trim();
            if (!username) return;
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
              password: username.toLowerCase(),
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

function buildWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Page 1: Config
  const settingsData = localStorage.getItem('isir_settings');
  if (settingsData) {
    const settings = JSON.parse(settingsData);
    const maxLen = Math.max(
      settings.auditTypes?.length || 0, settings.sections?.length || 0,
      settings.statusOptions?.length || 0, settings.valueStreams?.length || 0,
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
    'ID': s.id, 'Day': s.day, 'Month': s.month, 'Year': s.year,
    'Audit Type': s.auditType, 'Section': s.section, 'Value Stream': s.valueStream,
    'TTNR': s.ttnr, 'Description': s.description, 'Comments': s.comments,
    'OK/NOK': s.status, 'Due Date': s.dueDate, 'Decision Date': s.decisionDate,
    'MDGM': s.mdgm, 'ECR': s.ecr, 'SoftExpert': s.softExpert,
    'Problem Solving': s.problemSolving, 'Date': s.date, 'User': s.user,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleRows), 'Samples');

  // Page 3: Targets
  const targets = getTargets();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(targets.map((t) => ({
    'Audit Type': t.auditType, 'Target': t.target,
  }))), 'Targets');

  // Page 4: Users
  const users = getUsers();
  const permMap: Record<PagePermission, string> = {
    new_sample: 'new_sample', samples: 'edit_sample', settings: 'settings',
    dashboard: 'graphics', users: 'user_mgmt', targets: 'edit_target', links: 'links',
  };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users.map((u) => ({
    'Username': u.username, 'Password_Hash': '(local)', 'Role': u.role,
    'Permissions': u.permissions.map((p) => permMap[p] || p).join(','),
  }))), 'Users');

  return wb;
}

export function exportToExcel(): void {
  const wb = buildWorkbook();
  const fileName = `ISIR_Database_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
