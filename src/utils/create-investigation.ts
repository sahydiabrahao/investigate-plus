import { META_DEFAULTS } from '@/constants/investigation.constants';
import {
  INVESTIGATION_SCHEMA_VERSION,
  type InvestigationJson,
  type InvestigationMetaItem,
  type NotesRich,
} from '@/types/investigation.types';

function createEmptyLexicalState(): unknown {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '',
          indent: 0,
          direction: null,
          children: [],
        },
      ],
    },
  };
}

function createDefaultMeta(): InvestigationMetaItem[] {
  return META_DEFAULTS.map((key) => ({ key, value: '' }));
}

export function createNewInvestigation(): InvestigationJson {
  const now = new Date().toISOString();

  const notesRich: NotesRich = {
    format: 'lexical',
    state: createEmptyLexicalState(),
  };

  return {
    schemaVersion: INVESTIGATION_SCHEMA_VERSION,
    meta: createDefaultMeta(),
    notesRich,
    createdAt: now,
    updatedAt: now,
  };
}
