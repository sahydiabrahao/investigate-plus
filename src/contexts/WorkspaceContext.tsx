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

type CaseSummary = {
  name: string;
  path: string; // ✅ adiciona isso
  status: CaseStatus | null;
  meta: MetaItem[];
  updatedAt: string | null;
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

async function buildCasesIndex(tree: DirNodeWithStatus): Promise<CaseSummary[]> {
  const caseDirs = tree.children.filter((c): c is DirNodeWithStatus => c.type === 'directory');

  const summaries = await Promise.all(
    caseDirs.map(async (dir) => {
      const info = await readCaseSummary(dir.handle);

      dir.status = info.status;

      return {
        name: dir.name,
        path: dir.path,
        status: info.status,
        meta: info.meta,
        updatedAt: info.updatedAt,
      } satisfies CaseSummary;
    }),
  );

  summaries.sort((a, b) => {
    const ad = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bd = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bd - ad;
  });

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
