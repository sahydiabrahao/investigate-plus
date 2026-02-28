import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SlashCommand, SlashCommandsStore } from '@/types/slash-commands.types';
import { createEmptySlashCommandsStore, normalizeTrigger } from '@/types/slash-commands.types';

import { loadSlashCommands, saveSlashCommands } from '@/storage/slashCommands.storage';

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortByTrigger(items: SlashCommand[]) {
  return [...items].sort((a, b) => a.trigger.localeCompare(b.trigger));
}

type Listener = () => void;

let currentStore: SlashCommandsStore = createEmptySlashCommandsStore();
let currentLoading = true;
let didInit = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function setStore(next: SlashCommandsStore) {
  currentStore = next;
  emit();
}

function setLoading(next: boolean) {
  currentLoading = next;
  emit();
}

async function refreshFromStorage() {
  setLoading(true);
  try {
    const loaded = await loadSlashCommands();
    setStore(loaded);
  } finally {
    setLoading(false);
  }
}

async function initOnce() {
  if (didInit) return;
  didInit = true;

  initPromise =
    initPromise ??
    (async () => {
      await refreshFromStorage();
    })();

  await initPromise;
}

export type UseSlashCommandsResult = {
  loading: boolean;
  items: SlashCommand[];

  addCommand: (input: { trigger: string; template: string }) => Promise<void>;
  updateCommand: (id: string, patch: { trigger?: string; template?: string }) => Promise<void>;
  removeCommand: (id: string) => Promise<void>;

  importFromJsonText: (jsonText: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  exportToJsonText: () => string;

  refresh: () => Promise<void>;
};

export function useSlashCommands(): UseSlashCommandsResult {
  const [, force] = useState(0);

  useEffect(() => {
    const onChange = () => force((x) => x + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    void initOnce();
  }, []);

  const loading = currentLoading;

  const items = useMemo(() => sortByTrigger(currentStore.items), [currentStore.items]);

  const persist = useCallback(async (next: SlashCommandsStore) => {
    setStore(next);
    await saveSlashCommands(next);
  }, []);

  const refresh = useCallback(async () => {
    await refreshFromStorage();
  }, []);

  const addCommand = useCallback(
    async (input: { trigger: string; template: string }) => {
      const trigger = normalizeTrigger(input.trigger);
      const template = input.template ?? '';

      const exists = currentStore.items.some((x) => x.trigger === trigger);
      if (exists) return;

      const ts = nowIso();

      const next: SlashCommandsStore = {
        ...currentStore,
        items: [
          ...currentStore.items,
          {
            id: makeId(),
            trigger,
            template,
            createdAt: ts,
            updatedAt: ts,
          },
        ],
      };

      await persist(next);
    },
    [persist],
  );

  const updateCommand = useCallback(
    async (id: string, patch: { trigger?: string; template?: string }) => {
      const nextItems = currentStore.items.map((it) => {
        if (it.id !== id) return it;

        const nextTrigger = patch.trigger != null ? normalizeTrigger(patch.trigger) : it.trigger;
        const nextTemplate = patch.template != null ? patch.template : it.template;

        return {
          ...it,
          trigger: nextTrigger,
          template: nextTemplate,
          updatedAt: nowIso(),
        };
      });

      const next: SlashCommandsStore = { ...currentStore, items: nextItems };
      await persist(next);
    },
    [persist],
  );

  const removeCommand = useCallback(
    async (id: string) => {
      const next: SlashCommandsStore = {
        ...currentStore,
        items: currentStore.items.filter((x) => x.id !== id),
      };
      await persist(next);
    },
    [persist],
  );

  const exportToJsonText = useCallback(() => {
    const payload = {
      schemaVersion: currentStore.schemaVersion,
      items: currentStore.items.map((x) => ({
        id: x.id,
        trigger: x.trigger,
        template: x.template,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
      })),
    };
    return JSON.stringify(payload, null, 2);
  }, []);

  const importFromJsonText = useCallback(
    async (jsonText: string) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return { ok: false as const, error: 'JSON inválido.' };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { ok: false as const, error: 'JSON inválido.' };
      }

      const obj = parsed as { schemaVersion?: unknown; items?: unknown };

      if (!Array.isArray(obj.items)) {
        return { ok: false as const, error: 'JSON inválido: items ausente.' };
      }

      const nextItems: SlashCommand[] = [];

      for (const it of obj.items) {
        if (!it || typeof it !== 'object') continue;

        const x = it as Partial<SlashCommand>;

        if (typeof x.trigger !== 'string') continue;
        if (typeof x.template !== 'string') continue;

        const id = typeof x.id === 'string' && x.id.length > 0 ? x.id : makeId();
        const trigger = normalizeTrigger(x.trigger);

        const createdAt = typeof x.createdAt === 'string' ? x.createdAt : nowIso();
        const updatedAt = typeof x.updatedAt === 'string' ? x.updatedAt : nowIso();

        nextItems.push({
          id,
          trigger,
          template: x.template,
          createdAt,
          updatedAt,
        });
      }

      const dedup = new Map<string, SlashCommand>();
      for (const it of nextItems) dedup.set(it.trigger, it);

      const next: SlashCommandsStore = {
        ...currentStore,
        items: Array.from(dedup.values()),
      };

      await persist(next);
      return { ok: true as const };
    },
    [persist],
  );

  return {
    loading,
    items,
    addCommand,
    updateCommand,
    removeCommand,
    importFromJsonText,
    exportToJsonText,
    refresh,
  };
}
