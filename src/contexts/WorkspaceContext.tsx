import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loadDirectoryHandle,
  loadLastCasePath,
  saveDirectoryHandle,
  saveLastCasePath,
} from '@/storage';
import {
  type DirNode as BaseDirNode,
  type FileNode,
  scanDirectoryTree,
} from '@/utils/read-directory-tree';
import { INVESTIGATION_FILE, type CaseStatus } from '@/constants/investigation.constants';

type MetaItem = { key: string; value: string };

type OcParsed = {
  number: number;
  year: number;
  dp: number | null;
};

type CaseSummary = {
  name: string;
  path: string;
  status: CaseStatus | null;
  meta: MetaItem[];
  updatedAt: string | null;

  oc: OcParsed | null;

  hasIp: boolean;
  hasMc: boolean;

  ipNumber: number | null;
  mcNumber: number | null;

  crime: string | null;
  crimeNormalized: string | null;
};

type WorkspaceContextValue = {
  rootHandle: FileSystemDirectoryHandle | null;
  dirTree: BaseDirNode | null;

  cases: CaseSummary[];

  selectedCasePath: string | null;
  selectCase: (path: string | null) => void;

  importFolder: () => Promise<void>;
  refreshTree: () => Promise<void>;
};

type DirNodeWithStatus = Omit<BaseDirNode, 'children'> & {
  status?: CaseStatus | null;
  children: Array<DirNodeWithStatus | FileNode>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const };
  const current = await handle.queryPermission(opts);
  if (current === 'granted') return true;
  const next = await handle.requestPermission(opts);
  return next === 'granted';
}

function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function safeStatus(value: unknown): CaseStatus | null {
  if (
    value === 'PENDENTE' ||
    value === 'CONCLUIDO' ||
    value === 'URGENTE' ||
    value === 'AGUARDANDO' ||
    value === 'ANALISAR'
  ) {
    return value;
  }
  return null;
}

function safeMeta(value: unknown): MetaItem[] {
  if (!Array.isArray(value)) return [];
  const out: MetaItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const anyItem = item as { key?: unknown; value?: unknown };
    if (typeof anyItem.key !== 'string') continue;
    if (typeof anyItem.value !== 'string') continue;
    out.push({ key: anyItem.key, value: anyItem.value });
  }
  return out;
}

function normalizeMetaKey(key: string): string {
  return key.trim().toUpperCase();
}

function getMetaValue(meta: MetaItem[], key: string): string | null {
  const target = normalizeMetaKey(key);
  for (const item of meta) {
    if (normalizeMetaKey(item.key) === target) return item.value;
  }
  return null;
}

function hasMetaKey(meta: MetaItem[], key: string): boolean {
  const target = normalizeMetaKey(key);
  for (const item of meta) {
    if (normalizeMetaKey(item.key) === target) return true;
  }
  return false;
}

function parseFirstNumber(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function parseOcFromString(input: string): OcParsed | null {
  const text = input.trim();

  const re = /(?:^|[^A-Z0-9])OC\s*0*(\d{1,6})\s*[-/ ]\s*(\d{4})(?:\s*[-/ ]\s*DP\s*0*(\d{1,4}))?/i;
  const m = text.match(re);
  if (!m) return null;

  const ocNumber = Number.parseInt(m[1], 10);
  const year = Number.parseInt(m[2], 10);
  const dp = m[3] ? Number.parseInt(m[3], 10) : null;

  if (!Number.isFinite(ocNumber) || !Number.isFinite(year)) return null;
  if (year < 1900 || year > 3000) return null;

  return {
    number: ocNumber,
    year,
    dp: dp != null && Number.isFinite(dp) ? dp : null,
  };
}

function normalizeCrime(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function safeTime(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

async function readCaseSummary(dirHandle: FileSystemDirectoryHandle): Promise<{
  status: CaseStatus | null;
  meta: MetaItem[];
  updatedAt: string | null;
}> {
  try {
    const fh = await dirHandle.getFileHandle(INVESTIGATION_FILE);
    const file = await fh.getFile();
    const text = await file.text();

    const parsed = safeJsonParse(text);
    if (!parsed.ok) return { status: null, meta: [], updatedAt: null };

    const json = parsed.value as { status?: unknown; meta?: unknown; updatedAt?: unknown };

    const status = safeStatus(json?.status);
    const meta = safeMeta(json?.meta);

    const updatedAt = typeof json?.updatedAt === 'string' ? json.updatedAt : null;

    return { status, meta, updatedAt };
  } catch {
    return { status: null, meta: [], updatedAt: null };
  }
}

function buildDerivedSummaryFields(caseName: string, meta: MetaItem[]) {
  const oc = parseOcFromString(caseName);

  const hasIp = hasMetaKey(meta, 'IP');
  const hasMc = hasMetaKey(meta, 'MC');

  const ipValue = getMetaValue(meta, 'IP');
  const mcValue = getMetaValue(meta, 'MC');

  const ipNumber = parseFirstNumber(ipValue);
  const mcNumber = parseFirstNumber(mcValue);

  const crime = getMetaValue(meta, 'CRIME');
  const crimeNormalized = normalizeCrime(crime);

  return {
    oc,
    hasIp,
    hasMc,
    ipNumber,
    mcNumber,
    crime: crime && crime.trim() ? crime : null,
    crimeNormalized,
  };
}

async function buildCasesIndex(tree: DirNodeWithStatus): Promise<CaseSummary[]> {
  const caseDirs = tree.children.filter((c): c is DirNodeWithStatus => c.type === 'directory');

  const summaries = await Promise.all(
    caseDirs.map(async (dir) => {
      if (!dir.handle) {
        return {
          name: dir.name,
          path: dir.path,
          status: null,
          meta: [],
          updatedAt: null,

          oc: null,
          hasIp: false,
          hasMc: false,
          ipNumber: null,
          mcNumber: null,
          crime: null,
          crimeNormalized: null,
        } satisfies CaseSummary;
      }

      const info = await readCaseSummary(dir.handle);

      dir.status = info.status;

      const derived = buildDerivedSummaryFields(dir.name, info.meta);

      return {
        name: dir.name,
        path: dir.path,
        status: info.status,
        meta: info.meta,
        updatedAt: info.updatedAt,

        oc: derived.oc,
        hasIp: derived.hasIp,
        hasMc: derived.hasMc,
        ipNumber: derived.ipNumber,
        mcNumber: derived.mcNumber,
        crime: derived.crime,
        crimeNormalized: derived.crimeNormalized,
      } satisfies CaseSummary;
    }),
  );

  summaries.sort((a, b) => safeTime(b.updatedAt) - safeTime(a.updatedAt));

  return summaries;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirTree, setDirTree] = useState<BaseDirNode | null>(null);

  const [cases, setCases] = useState<CaseSummary[]>([]);

  const [selectedCasePath, setSelectedCasePath] = useState<string | null>(null);

  const selectCase = useCallback((path: string | null) => {
    setSelectedCasePath(path);
    saveLastCasePath(path).catch(console.error);
  }, []);

  const buildTree = useCallback(
    async (handle: FileSystemDirectoryHandle, desiredCasePath?: string | null) => {
      const ok = await requestPermission(handle);
      if (!ok) return;

      const tree = (await scanDirectoryTree(handle)) as DirNodeWithStatus;

      const nextCases = await buildCasesIndex(tree);

      setDirTree(tree);
      setCases(nextCases);

      if (desiredCasePath && pathExistsInTree(tree, desiredCasePath)) {
        setSelectedCasePath(desiredCasePath);
        return;
      }

      if (selectedCasePath && !pathExistsInTree(tree, selectedCasePath)) {
        setSelectedCasePath(null);
        saveLastCasePath(null).catch(console.error);
      }
    },
    [selectedCasePath],
  );

  useEffect(() => {
    (async () => {
      const saved = await loadDirectoryHandle();
      if (!saved) return;

      const ok = await requestPermission(saved);
      if (!ok) return;

      setRootHandle(saved);

      const lastCasePath = await loadLastCasePath();
      await buildTree(saved, lastCasePath);
    })().catch(console.error);
  }, [buildTree]);

  const importFolder = useCallback(async () => {
    const handle = await window.showDirectoryPicker();
    const ok = await requestPermission(handle);
    if (!ok) return;

    await saveDirectoryHandle(handle);
    await saveLastCasePath(null);

    setRootHandle(handle);
    setSelectedCasePath(null);

    await buildTree(handle, null);
  }, [buildTree]);

  const refreshTree = useCallback(async () => {
    if (!rootHandle) return;

    const desired = selectedCasePath ?? (await loadLastCasePath());
    await buildTree(rootHandle, desired);
  }, [rootHandle, buildTree, selectedCasePath]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      rootHandle,
      dirTree,
      cases,
      selectedCasePath,
      selectCase,
      importFolder,
      refreshTree,
    }),
    [rootHandle, dirTree, cases, selectedCasePath, selectCase, importFolder, refreshTree],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

function pathExistsInTree(tree: BaseDirNode, targetPath: string): boolean {
  if (tree.path === targetPath) return true;

  for (const child of tree.children) {
    if (child.path === targetPath) return true;

    if (child.type === 'directory') {
      if (pathExistsInTree(child, targetPath)) return true;
    }
  }

  return false;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
