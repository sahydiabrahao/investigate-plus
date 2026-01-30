export const INVESTIGATION_SCHEMA_VERSION = 1 as const;

export type InvestigationSchemaVersion = typeof INVESTIGATION_SCHEMA_VERSION;

export type InvestigationMetaKey = string;

export type InvestigationMetaItem = {
  key: InvestigationMetaKey;
  value: string;
};

export type NotesRich = {
  format: 'lexical';

  state: unknown;
};

export type InvestigationJson = {
  schemaVersion: InvestigationSchemaVersion;

  meta: InvestigationMetaItem[];

  notesRich: NotesRich;

  createdAt: string;
  updatedAt: string;
};
