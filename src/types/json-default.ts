export type CaseStatus = 'null' | 'waiting' | 'completed' | 'urgent' | 'review';

export interface CaseRecord {
  id: string;
  target: string;
  targetRich?: string | null;
  details: string;
  detailsRich?: string | null;
  linkFiles?: string[];
}

export interface CaseMetadata {
  id: string;
  title: string;
  crime: string;
  victim: string;
  date: string;
  notes: string;
  status: CaseStatus;
}

export interface CaseJson {
  case: CaseMetadata;
  records: CaseRecord[];
}

export type CaseSummary = {
  id: string;
  title: string;
  crime: string;
  victim: string;
  date: string;
  notes: string;
  status: CaseStatus;

  folderPath: string;
  folderName: string;
  fileName: string;
  handle: FileSystemFileHandle;
};

export function createEmptyRecord(): CaseRecord {
  return {
    id: crypto.randomUUID(),
    target: '',
    targetRich: null,
    details: '',
    detailsRich: null,
    linkFiles: [],
  };
}

export function createNewCase(caseId: string): CaseJson {
  return {
    case: {
      id: caseId,
      title: 'TÍTULO',
      crime: 'CRIME',
      victim: 'NOME',
      date: 'XX/XX/XXXX',
      notes: 'ANOTAÇÕES',
      status: 'null',
    },
    records: [createEmptyRecord()],
  };
}

export function normalizeCaseJson(raw: Partial<CaseJson>): CaseJson {
  const caseId = raw?.case?.id ?? 'sem-id';
  const base = createNewCase(caseId);

  const normalizedCase: CaseMetadata = {
    ...base.case,
    ...raw.case,
  };

  const normalizedRecords: CaseRecord[] = Array.isArray(raw.records)
    ? raw.records.map((r: Partial<CaseRecord>): CaseRecord => {
        const empty = createEmptyRecord();

        return {
          ...empty,
          ...r,
          id: r.id ?? crypto.randomUUID(),
        };
      })
    : base.records;

  return {
    case: normalizedCase,
    records: normalizedRecords,
  };
}
