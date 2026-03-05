import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TagDefinition } from '@/types/tag.types';
import type { TagsStore } from '@/types/tags-store.types';
import { createEmptyTagsStore } from '@/types/tags-store.types';

import { loadTags, saveTags } from '@/storage/tags.storage';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortByLabel(items: TagDefinition[]) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

type Listener = () => void;

let currentStore: TagsStore = createEmptyTagsStore();
let currentLoading = true;
let didInit = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function setStore(next: TagsStore) {
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
    const loaded = await loadTags();
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

export type UseTagsResult = {
  loading: boolean;
  items: TagDefinition[];

  addTag: (input: { label: string; styleId: 1 | 2 | 3 | 4 | 5 }) => Promise<void>;
  updateTag: (
    id: string,
    patch: {
      label?: string;
      styleId?: 1 | 2 | 3 | 4 | 5;
    },
  ) => Promise<void>;
  removeTag: (id: string) => Promise<void>;

  importFromJsonText: (jsonText: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  exportToJsonText: () => string;

  refresh: () => Promise<void>;
};

export function useTags(): UseTagsResult {
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

  const items = useMemo(() => sortByLabel(currentStore.items), [currentStore.items]);

  const persist = useCallback(async (next: TagsStore) => {
    setStore(next);
    await saveTags(next);
  }, []);

  const refresh = useCallback(async () => {
    await refreshFromStorage();
  }, []);

  const addTag = useCallback(
    async (input: { label: string; styleId: 1 | 2 | 3 | 4 | 5 }) => {
      const label = (input.label ?? '').trim();
      if (!label) return;

      const exists = currentStore.items.some((x) => x.label === label);
      if (exists) return;

      const next: TagsStore = {
        ...currentStore,
        items: [
          ...currentStore.items,
          {
            id: makeId(),
            label,
            styleId: input.styleId,
          },
        ],
      };

      await persist(next);
    },
    [persist],
  );

  const updateTag = useCallback(
    async (
      id: string,
      patch: {
        label?: string;
        styleId?: 1 | 2 | 3 | 4 | 5;
      },
    ) => {
      const nextItems = currentStore.items.map((it) => {
        if (it.id !== id) return it;

        const nextLabel = patch.label != null ? patch.label.trim() : it.label;
        const nextStyleId = patch.styleId != null ? patch.styleId : it.styleId;

        return {
          ...it,
          label: nextLabel,
          styleId: nextStyleId,
        };
      });

      const next: TagsStore = { ...currentStore, items: nextItems };
      await persist(next);
    },
    [persist],
  );

  const removeTag = useCallback(
    async (id: string) => {
      const next: TagsStore = {
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
        label: x.label,
        styleId: x.styleId,
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

      const nextItems: TagDefinition[] = [];

      for (const it of obj.items) {
        if (!it || typeof it !== 'object') continue;

        const x = it as Partial<TagDefinition>;

        if (typeof x.label !== 'string') continue;
        if (typeof x.styleId !== 'number') continue;
        if (x.styleId < 1 || x.styleId > 5) continue;

        const id = typeof x.id === 'string' && x.id.length > 0 ? x.id : makeId();
        const label = x.label.trim();
        if (!label) continue;

        nextItems.push({
          id,
          label,
          styleId: x.styleId as 1 | 2 | 3 | 4 | 5,
        });
      }

      const dedup = new Map<string, TagDefinition>();
      for (const it of nextItems) dedup.set(it.label, it);

      const next: TagsStore = {
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
    addTag,
    updateTag,
    removeTag,
    importFromJsonText,
    exportToJsonText,
    refresh,
  };
}
