import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadDirectoryHandle, saveDirectoryHandle } from '@/storage';
import { DirNode, scanDirectoryTree } from '@/utils/read-directory-tree';

type WorkspaceContextValue = {
  rootHandle: FileSystemDirectoryHandle | null;
  dirTree: DirNode | null;
  importFolder: () => Promise<void>;
  refreshTree: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const };
  const current = await handle.queryPermission(opts);
  if (current === 'granted') return true;
  const next = await handle.requestPermission(opts);
  return next === 'granted';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirTree, setDirTree] = useState<DirNode | null>(null);

  const buildTree = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const ok = await requestPermission(handle);
    if (!ok) return;
    const tree = await scanDirectoryTree(handle);
    setDirTree(tree);
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await loadDirectoryHandle();
      if (!saved) return;
      const ok = await requestPermission(saved);
      if (!ok) return;
      setRootHandle(saved);
      await buildTree(saved);
    })().catch(console.error);
  }, [buildTree]);

  const importFolder = useCallback(async () => {
    const handle = await window.showDirectoryPicker();
    const ok = await requestPermission(handle);
    if (!ok) return;

    await saveDirectoryHandle(handle);
    setRootHandle(handle);
    await buildTree(handle);
  }, [buildTree]);

  const refreshTree = useCallback(async () => {
    if (!rootHandle) return;
    await buildTree(rootHandle);
  }, [rootHandle, buildTree]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ rootHandle, dirTree, importFolder, refreshTree }),
    [rootHandle, dirTree, importFolder, refreshTree],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
