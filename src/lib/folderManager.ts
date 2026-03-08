// ── Sample Folder Management ───────────────────────────────────
// Uses File System Access API to manage sample folders on the local filesystem.
// Root directory handle is stored in IndexedDB for persistence.

let rootDirHandle: FileSystemDirectoryHandle | null = null;
let folderConnected = false;

const IDB_NAME = 'isir_folders_db';
const IDB_STORE = 'dirHandles';
const IDB_KEY = 'rootDir';
const DIR_NAME_KEY = 'isir_root_folder_name';

// ── IndexedDB helpers ──────────────────────────────────────────
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
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
export function isFolderConnected(): boolean {
  return folderConnected && rootDirHandle !== null;
}

export function getRootFolderName(): string | null {
  return localStorage.getItem(DIR_NAME_KEY);
}

export function isFSSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/** Let user pick a root directory for samples */
export async function pickRootFolder(): Promise<{ name: string } | null> {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    rootDirHandle = handle;
    folderConnected = true;
    localStorage.setItem(DIR_NAME_KEY, handle.name);
    await saveHandleToIDB(handle);
    return { name: handle.name };
  } catch {
    return null;
  }
}

/** Restore directory handle from IndexedDB */
export async function restoreRootFolder(): Promise<boolean> {
  try {
    const handle = await getHandleFromIDB();
    if (!handle) return false;
    const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      rootDirHandle = handle;
      folderConnected = true;
      return true;
    }
    const reqPerm = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (reqPerm === 'granted') {
      rootDirHandle = handle;
      folderConnected = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Disconnect root folder */
export function disconnectRootFolder(): void {
  rootDirHandle = null;
  folderConnected = false;
  localStorage.removeItem(DIR_NAME_KEY);
  removeHandleFromIDB();
}

/**
 * Create folder structure for a sample: rootDir / sampleId / ttnr /
 * Returns true if created successfully.
 */
export async function createSampleFolders(sampleId: string, ttnr: string): Promise<boolean> {
  if (!rootDirHandle) return false;
  try {
    const sampleDir = await rootDirHandle.getDirectoryHandle(sampleId, { create: true });
    if (ttnr.trim()) {
      await sampleDir.getDirectoryHandle(ttnr.trim(), { create: true });
    }
    return true;
  } catch (e) {
    console.error('Failed to create sample folders:', e);
    return false;
  }
}

/**
 * Open the sample folder. Returns the directory handle for potential further use.
 * In browsers, we can't "open" a folder in Explorer, but we can verify it exists
 * and return info. The UI will show a toast confirming the path.
 */
export async function getSampleFolderHandle(sampleId: string): Promise<FileSystemDirectoryHandle | null> {
  if (!rootDirHandle) return null;
  try {
    return await rootDirHandle.getDirectoryHandle(sampleId, { create: false });
  } catch {
    return null;
  }
}

/** List subfolders inside a sample folder */
export async function listSampleSubfolders(sampleId: string): Promise<string[]> {
  if (!rootDirHandle) return [];
  try {
    const sampleDir = await rootDirHandle.getDirectoryHandle(sampleId, { create: false });
    const folders: string[] = [];
    for await (const [name, handle] of (sampleDir as any).entries()) {
      if (handle.kind === 'directory') folders.push(name);
    }
    return folders;
  } catch {
    return [];
  }
}
