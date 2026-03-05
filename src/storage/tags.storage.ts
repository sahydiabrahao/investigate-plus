import type { TagsStore } from '@/types/tags-store.types';
import {
  clearTagsPreferenciasGlobais,
  loadTagsPreferenciasGlobais,
  saveTagsPreferenciasGlobais,
} from '@/storage/preferencias-globais.storage';

export async function loadTags(): Promise<TagsStore> {
  return loadTagsPreferenciasGlobais();
}

export async function saveTags(store: TagsStore): Promise<void> {
  await saveTagsPreferenciasGlobais(store);
}

export async function clearTags(): Promise<void> {
  await clearTagsPreferenciasGlobais();
}
