import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DirNode, NodeItem } from '@/utils/read-directory-tree';
import { useReadDirectoryHandle } from '@/hooks';
import type { CaseStatus } from '@/types/json-default';
import { loadAllCaseStatus, saveCaseStatus } from '@/storage';

type CaseStatusMap = Record<string, CaseStatus>;

export type ViewMode = 'dashboard' | 'overview';

type CaseContextValue = {
  rootHandle: FileSystemDirectoryHandle | null;
  dirTree: DirNode | null;
  setDirTree: React.Dispatch<React.SetStateAction<DirNode | null>>;
  importFolder: () => Promise<void>;

  selectedCaseHandle: FileSystemFileHandle | null;
  setSelectedCaseHandle: React.Dispatch<React.SetStateAction<FileSystemFileHandle | null>>;

  selectedCaseTree: DirNode | null;

  selectCase: (handle: FileSystemFileHandle, parentDirPath: string | null) => void;

  statusByFile: CaseStatusMap;
  getStatus: (fileKey: string) => CaseStatus;
  setStatus: (fileKey: string, status: CaseStatus) => void;

  currentDirPath: string | null;
  setCurrentDirPath: (path: string | null) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const CaseContext = createContext<CaseContextValue | null>(null);

function findDirNodeByPath(root: DirNode, path: string): DirNode | null {
  const stack: NodeItem[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (node.type === 'directory') {
      if (node.path === path) return node;
      stack.push(...node.children);
    }
  }

  return null;
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const { dirTree, setDirTree, rootHandle, importFolder } = useReadDirectoryHandle();

  const [selectedCaseHandle, setSelectedCaseHandle] = useState<FileSystemFileHandle | null>(null);

  const [selectedCaseDirPath, setSelectedCaseDirPath] = useState<string | null>(null);

  const [selectedCaseTree, setSelectedCaseTree] = useState<DirNode | null>(null);

  const [statusByFile, setStatusByFile] = useState<CaseStatusMap>({});

  const [currentDirPath, setCurrentDirPath] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  useEffect(() => {
    (async () => {
      try {
        const initial = await loadAllCaseStatus();
        setStatusByFile(initial);
      } catch (err) {
        console.error('Erro ao carregar status dos casos:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (dirTree && !currentDirPath) {
      setCurrentDirPath(dirTree.path);
    }
  }, [dirTree, currentDirPath]);

  useEffect(() => {
    if (!dirTree || !selectedCaseDirPath) {
      setSelectedCaseTree(null);
      return;
    }

    const found = findDirNodeByPath(dirTree, selectedCaseDirPath);
    setSelectedCaseTree(found);
  }, [dirTree, selectedCaseDirPath]);

  const getStatus = useCallback(
    (fileKey: string): CaseStatus => {
      return statusByFile[fileKey] ?? 'null';
    },
    [statusByFile],
  );

  const setStatus = useCallback((fileKey: string, status: CaseStatus) => {
    setStatusByFile((prev) => ({
      ...prev,
      [fileKey]: status,
    }));

    saveCaseStatus(fileKey, status).catch((err) => {
      console.error('Erro ao salvar status do caso:', err);
    });
  }, []);

  const selectCase = useCallback(
    (handle: FileSystemFileHandle, parentDirPath: string | null) => {
      setSelectedCaseHandle(handle);

      if (!parentDirPath) {
        setSelectedCaseDirPath(null);
        setSelectedCaseTree(null);
        return;
      }

      setSelectedCaseDirPath(parentDirPath);

      if (dirTree) {
        const found = findDirNodeByPath(dirTree, parentDirPath);
        setSelectedCaseTree(found);
      } else {
        setSelectedCaseTree(null);
      }
    },
    [dirTree],
  );

  const value = useMemo<CaseContextValue>(
    () => ({
      rootHandle,
      dirTree,
      setDirTree,
      importFolder,

      selectedCaseHandle,
      setSelectedCaseHandle,

      selectedCaseTree,
      selectCase,

      statusByFile,
      getStatus,
      setStatus,

      currentDirPath,
      setCurrentDirPath,

      viewMode,
      setViewMode,
    }),
    [
      rootHandle,
      dirTree,
      importFolder,
      selectedCaseHandle,
      selectedCaseTree,
      selectCase,
      statusByFile,
      getStatus,
      setStatus,
      currentDirPath,
      viewMode,
    ],
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCaseContext() {
  const ctx = useContext(CaseContext);
  if (!ctx) {
    throw new Error('useCaseContext must be used inside <CaseProvider>');
  }
  return ctx;
}
