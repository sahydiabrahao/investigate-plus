import type { SlashCommandsStore } from '@/types/slash-commands.types';
import {
  SLASH_COMMANDS_SCHEMA_VERSION,
  createEmptySlashCommandsStore,
} from '@/types/slash-commands.types';

const STORAGE_KEY = 'investigate_plus_slash_commands_v1';

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

function loadFromLocalStorage(): SlashCommandsStore {
  if (!canUseLocalStorage()) return createEmptySlashCommandsStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySlashCommandsStore();

    const parsed = JSON.parse(raw) as SlashCommandsStore;
    if (!parsed || parsed.schemaVersion !== SLASH_COMMANDS_SCHEMA_VERSION) {
      return createEmptySlashCommandsStore();
    }

    return parsed;
  } catch {
    return createEmptySlashCommandsStore();
  }
}

function saveToLocalStorage(store: SlashCommandsStore): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export async function loadSlashCommands(): Promise<SlashCommandsStore> {
  const storage = getChromeStorage();
  if (!storage) return loadFromLocalStorage();

  return new Promise((resolve) => {
    storage.get([STORAGE_KEY], (result) => {
      const raw = result?.[STORAGE_KEY];

      if (!raw || raw.schemaVersion !== SLASH_COMMANDS_SCHEMA_VERSION) {
        resolve(createEmptySlashCommandsStore());
        return;
      }

      resolve(raw as SlashCommandsStore);
    });
  });
}

export async function saveSlashCommands(store: SlashCommandsStore): Promise<void> {
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

export async function clearSlashCommands(): Promise<void> {
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
