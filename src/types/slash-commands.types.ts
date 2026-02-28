export const SLASH_COMMANDS_SCHEMA_VERSION = 1 as const;
export type SlashCommandsSchemaVersion = typeof SLASH_COMMANDS_SCHEMA_VERSION;

export type SlashCommandId = string;

export type SlashCommand = {
  id: SlashCommandId;
  trigger: string;
  template: string;
  createdAt: string;
  updatedAt: string;
};

export type SlashCommandsStore = {
  schemaVersion: SlashCommandsSchemaVersion;
  items: SlashCommand[];
};

export function normalizeTrigger(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return t.startsWith('/') ? t : `/${t}`;
}

export function createEmptySlashCommandsStore(): SlashCommandsStore {
  return {
    schemaVersion: SLASH_COMMANDS_SCHEMA_VERSION,
    items: [],
  };
}
