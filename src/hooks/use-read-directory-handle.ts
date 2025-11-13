import { useCallback, useEffect, useState } from 'react';
import { scanDirectoryTree, type DirNode } from '@/utils/read-directory-tree';
import { loadDirectoryHandle, saveDirectoryHandle } from '@/storage';

type UseReadDirectoryHandleResult = {
  dirTree: DirNode | null;
  setDirTree: React.Dispatch<React.SetStateAction<DirNode | null>>;
  rootHandle: FileSystemDirectoryHandle | null;
  importFolder: () => Promise<void>;
};

export function useReadDirectoryHandle(): UseReadDirectoryHandleResult {
  const [dirTree, setDirTree] = useState<DirNode | null>(null);
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const handle = await loadDirectoryHandle();
        if (!handle) return;

        const currentPermission =
          (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';

        let granted = currentPermission === 'granted';

        if (!granted && handle.requestPermission) {
          const result = await handle.requestPermission({ mode: 'readwrite' });
          granted = result === 'granted';
        }

        if (!granted) return;

        const tree = await scanDirectoryTree(handle);
        if (cancelled) return;

        setRootHandle(handle);
        setDirTree(tree);
      } catch (error) {
        console.error('Erro ao restaurar diretório salvo:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const importFolder = useCallback(async () => {
    try {
      if (!window.showDirectoryPicker) {
        alert('Seu navegador não suporta seleção de pastas.');
        return;
      }

      const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      await saveDirectoryHandle(dir);

      const tree = await scanDirectoryTree(dir);

      setRootHandle(dir);
      setDirTree(tree);
    } catch (error) {
      console.error('Erro ao importar pasta:', error);
    }
  }, []);

  return {
    dirTree,
    setDirTree,
    rootHandle,
    importFolder,
  };
}
