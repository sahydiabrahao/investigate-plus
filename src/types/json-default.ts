export type RecordStatus = 'waiting' | 'pending' | 'answered';

export interface CaseRecord {
  id: string;
  target: string;
  details: string;
  status: RecordStatus;
}

export interface CaseMetadata {
  id: string;
  title: string;
  crime: string;
  victim: string;
  date: string;
}

export interface CaseJson {
  version: number;
  case: CaseMetadata;
  records: CaseRecord[];
}

export function createEmptyRecord(): CaseRecord {
  return {
    id: crypto.randomUUID(),
    target: '',
    details: '',
    status: 'waiting',
  };
}

export function createNewCase(caseId: string): CaseJson {
  return {
    version: 1,
    case: {
      id: caseId,
      title: 'title',
      crime: 'crime',
      victim: 'victim',
      date: 'XX/XX/XXXX',
    },
    records: [createEmptyRecord()],
  };
}
