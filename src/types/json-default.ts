export type CaseStatus = 'null' | 'waiting' | 'completed' | 'urgent' | 'review';

export interface CaseRecord {
  id: string;
  target: string;
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
  resume: string;
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
  resume: string;
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
    details: '',
    linkFiles: [],
  };
}

export function createNewCase(caseId: string): CaseJson {
  return {
    case: {
      id: caseId,
      title: 'TÍTULO',
      crime: 'FATO',
      victim: 'NOME',
      date: 'XX/XX/XXXX',
      resume: 'RESUMO',
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
          target: r.target ?? '',
          details: r.details ?? '',
          detailsRich: r.detailsRich ?? null,
          linkFiles: Array.isArray(r.linkFiles) ? r.linkFiles : empty.linkFiles,
        };
      })
    : base.records;

  return {
    case: normalizedCase,
    records: normalizedRecords,
  };
}
