const DB_NAME = 'investigate-plus';
const STORE_NAME = 'workspace';

const KEY_ROOT_DIRECTORY = 'root-directory';
const KEY_LAST_CASE_PATH = 'last-case-path';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  store.put(handle, KEY_ROOT_DIRECTORY);

  await waitTransaction(tx);
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  const request = store.get(KEY_ROOT_DIRECTORY);

  return new Promise((resolve) => {
    request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function saveLastCasePath(path: string | null): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  if (path) {
    store.put(path, KEY_LAST_CASE_PATH);
  } else {
    store.delete(KEY_LAST_CASE_PATH);
  }

  await waitTransaction(tx);
}

export async function loadLastCasePath(): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  const request = store.get(KEY_LAST_CASE_PATH);

  return new Promise((resolve) => {
    request.onsuccess = () => resolve((request.result as string) ?? null);
    request.onerror = () => resolve(null);
  });
}
