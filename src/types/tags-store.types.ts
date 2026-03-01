import type { TagDefinition } from '@/types/tag.types';

export const TAGS_SCHEMA_VERSION = 1 as const;
export type TagsSchemaVersion = typeof TAGS_SCHEMA_VERSION;

export type TagsStore = {
  schemaVersion: TagsSchemaVersion;
  items: TagDefinition[];
};

export function createEmptyTagsStore(): TagsStore {
  return {
    schemaVersion: TAGS_SCHEMA_VERSION,
    items: [],
  };
}
