import type { TagsStore } from '@/types/tags-store.types';
import { TAGS_SCHEMA_VERSION, createEmptyTagsStore } from '@/types/tags-store.types';

const STORAGE_KEY = 'investigate_plus_tags_v1';

function getChromeStorage(): typeof chrome.storage.local | null {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function canUseLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const k = '__test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

type UnknownStore = {
  schemaVersion?: unknown;
  items?: unknown;
};

type UnknownItem = {
  id?: unknown;
  label?: unknown;
  styleId?: unknown;
};

function normalizeStore(raw: unknown): TagsStore {
  if (!raw || typeof raw !== 'object') return createEmptyTagsStore();

  const store = raw as UnknownStore;

  if (store.schemaVersion !== TAGS_SCHEMA_VERSION) return createEmptyTagsStore();
  if (!Array.isArray(store.items)) return createEmptyTagsStore();

  const items: TagsStore['items'] = [];

  for (const it of store.items) {
    if (!it || typeof it !== 'object') continue;
    const x = it as UnknownItem;

    if (typeof x.id !== 'string' || x.id.trim().length === 0) continue;
    if (typeof x.label !== 'string' || x.label.trim().length === 0) continue;
    if (typeof x.styleId !== 'number') continue;

    const styleId = x.styleId;
    if (styleId < 1 || styleId > 5) continue;

    items.push({
      id: x.id,
      label: x.label.trim(),
      styleId: styleId as 1 | 2 | 3 | 4 | 5,
    });
  }

  return {
    schemaVersion: TAGS_SCHEMA_VERSION,
    items,
  };
}

function loadFromLocalStorage(): TagsStore {
  if (!canUseLocalStorage()) return createEmptyTagsStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyTagsStore();

    const parsed: unknown = JSON.parse(raw);
    return normalizeStore(parsed);
  } catch {
    return createEmptyTagsStore();
  }
}

function saveToLocalStorage(store: TagsStore): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export async function loadTags(): Promise<TagsStore> {
  const storage = getChromeStorage();
  if (!storage) return loadFromLocalStorage();

  return new Promise((resolve) => {
    storage.get([STORAGE_KEY], (result) => {
      const raw: unknown = result?.[STORAGE_KEY];
      resolve(normalizeStore(raw));
    });
  });
}

export async function saveTags(store: TagsStore): Promise<void> {
  const storage = getChromeStorage();
  if (!storage) {
    saveToLocalStorage(store);
    return;
  }

  return new Promise((resolve) => {
    storage.set(
      {
        [STORAGE_KEY]: store,
      },
      () => resolve(),
    );
  });
}

export async function clearTags(): Promise<void> {
  const storage = getChromeStorage();
  if (!storage) {
    if (canUseLocalStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return;
  }

  return new Promise((resolve) => {
    storage.remove([STORAGE_KEY], () => resolve());
  });
}
