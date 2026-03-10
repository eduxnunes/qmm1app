import { AppSettings } from './settings';
import { AuditTarget } from './types';
import { AppLink } from './links';
import { AppUser } from './auth';

// ── Config file structure ──────────────────────────────────────
export interface ConfigFileData {
  settings: AppSettings;
  targets: AuditTarget[];
  links: AppLink[];
  users?: AppUser[];
}

// ── File System Access API ─────────────────────────────────────
let fileHandle: FileSystemFileHandle | null = null;
let configConnected = false;

const IDB_NAME = 'isir_config_db';
const IDB_STORE = 'configHandles';
const IDB_KEY = 'configHandle';
const FILE_NAME_KEY = 'isir_config_filename';

// ── IndexedDB helpers ──────────────────────────────────────────
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

// ── Public API ─────────────────────────────────────────────────
export function isConfigConnected(): boolean {
  return configConnected && fileHandle !== null;
}

export function getConfigFileName(): string | null {
  return localStorage.getItem(FILE_NAME_KEY);
}

export function isFileSystemSupported(): boolean {
  return 'showOpenFilePicker' in window;
}

/** Pick an existing JSON config file */
export async function pickConfigFile(): Promise<{ name: string } | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'JSON Config', accept: { 'application/json': ['.json'] } }],
    });
    fileHandle = handle;
    configConnected = true;
    localStorage.setItem(FILE_NAME_KEY, handle.name);
    await saveHandleToIDB(handle);
    return { name: handle.name };
  } catch {
    return null;
  }
}

/** Create a new JSON config file */
export async function createConfigFile(): Promise<{ name: string } | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'isir-config.json',
      types: [{ description: 'JSON Config', accept: { 'application/json': ['.json'] } }],
    });
    fileHandle = handle;
    configConnected = true;
    localStorage.setItem(FILE_NAME_KEY, handle.name);
    await saveHandleToIDB(handle);
    return { name: handle.name };
  } catch {
    return null;
  }
}

/** Restore handle from IndexedDB (auto-reconnect) */
export async function restoreConfigHandle(): Promise<boolean> {
  try {
    const handle = await getHandleFromIDB();
    if (!handle) return false;
    const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      fileHandle = handle;
      configConnected = true;
      return true;
    }
    // Need to request — requires user gesture
    const reqPerm = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (reqPerm === 'granted') {
      fileHandle = handle;
      configConnected = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Disconnect config file */
export function disconnectConfigFile(): void {
  fileHandle = null;
  configConnected = false;
  localStorage.removeItem(FILE_NAME_KEY);
  removeHandleFromIDB();
}

/** Save config data to the linked file */
export async function saveConfigToFile(data: ConfigFileData): Promise<void> {
  if (!fileHandle) return;
  try {
    const writable = await (fileHandle as any).createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (e) {
    console.error('Config file save failed:', e);
  }
}

/** Load config data from the linked file */
export async function loadConfigFromFile(): Promise<ConfigFileData | null> {
  if (!fileHandle) return null;
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as ConfigFileData;
  } catch (e) {
    console.error('Config file load failed:', e);
    return null;
  }
}

/** Auto-save: gather current localStorage data and write to file */
export async function autoSaveConfig(): Promise<void> {
  if (!fileHandle) return;
  const { getSettings } = await import('./settings');
  const { getTargets } = await import('./store');
  const { getLinks } = await import('./links');
  
  const data: ConfigFileData = {
    settings: getSettings(),
    targets: getTargets(),
    links: getLinks(),
  };
  await saveConfigToFile(data);
}
