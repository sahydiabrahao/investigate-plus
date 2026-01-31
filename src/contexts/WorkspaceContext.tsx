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

type WorkspaceContextValue = {
  rootHandle: FileSystemDirectoryHandle | null;
  dirTree: BaseDirNode | null;

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

async function readCaseStatus(dirHandle: FileSystemDirectoryHandle): Promise<CaseStatus | null> {
  try {
    const fh = await dirHandle.getFileHandle(INVESTIGATION_FILE);
    const file = await fh.getFile();
    const text = await file.text();

    const parsed = safeJsonParse(text);
    if (!parsed.ok) return null;

    const json = parsed.value as { status?: unknown };
    const status = json?.status;

    if (
      status === 'PENDENTE' ||
      status === 'CONCLUIDO' ||
      status === 'URGENTE' ||
      status === 'AGUARDANDO'
    ) {
      return status;
    }

    return null;
  } catch {
    return null;
  }
}

async function attachStatusesToCases(tree: DirNodeWithStatus): Promise<void> {
  const tasks = tree.children.map(async (child) => {
    if (child.type !== 'directory') return;
    child.status = await readCaseStatus(child.handle);
  });

  await Promise.all(tasks);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirTree, setDirTree] = useState<BaseDirNode | null>(null);

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

      await attachStatusesToCases(tree);

      setDirTree(tree);

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
      selectedCasePath,
      selectCase,
      importFolder,
      refreshTree,
    }),
    [rootHandle, dirTree, selectedCasePath, selectCase, importFolder, refreshTree],
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
