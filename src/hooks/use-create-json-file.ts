import { useCallback } from 'react';
import { scanDirectoryTree, type DirNode } from '@/utils/read-directory-tree';

type UseCreateJsonFileParams = {
  rootHandle: FileSystemDirectoryHandle | null;
  dirTree: DirNode | null;
  currentDirPath: string | null;
  setDirTree: React.Dispatch<React.SetStateAction<DirNode | null>>;
};

type UseCreateJsonFileResult = {
  createJsonFile: () => Promise<void>;
};

async function getDirectoryHandleByPath(
  root: FileSystemDirectoryHandle,
  rootPath: string,
  targetPath: string
): Promise<FileSystemDirectoryHandle> {
  if (targetPath === rootPath) return root;

  const relative = targetPath.slice(rootPath.length + 1);
  const segments = relative.split('/').filter(Boolean);

  let current: FileSystemDirectoryHandle = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }
  return current;
}

export function useCreateJsonFile({
  rootHandle,
  dirTree,
  currentDirPath,
  setDirTree,
}: UseCreateJsonFileParams): UseCreateJsonFileResult {
  const createJsonFile = useCallback(async () => {
    if (!rootHandle || !dirTree) {
      alert('Nenhuma pasta selecionada. Importe uma pasta antes de criar o JSON.');
      return;
    }

    const targetPath = currentDirPath ?? dirTree.path;
    const caseId = targetPath.split('/').pop()!;
    const fileName = `${caseId}.json`;

    const confirmCreate = window.confirm(
      `Deseja criar o arquivo "${fileName}" na pasta "${caseId}"?`
    );
    if (!confirmCreate) return;

    const dirHandle = await getDirectoryHandleByPath(rootHandle, dirTree.path, targetPath);

    try {
      await dirHandle.getFileHandle(fileName, { create: false });
      alert(`O arquivo "${fileName}" já existe nesta pasta.`);
      return;
    } catch (err: unknown) {
      if (!(err instanceof DOMException) || err.name !== 'NotFoundError') {
        console.error('Erro ao verificar arquivo JSON:', err);
        alert('Erro ao verificar se o arquivo já existe.');
        return;
      }
    }

    const data = {
      version: 1,
      case: {
        id: caseId,
        title: 'title',
        crime: 'crime',
        victim: 'victim',
      },
      updatedAt: new Date().toISOString(),
      records: [
        {
          id: crypto.randomUUID(),
          status: '',
          value: '',
        },
      ],
    };

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    const updatedTree = await scanDirectoryTree(rootHandle);
    setDirTree(updatedTree);
  }, [rootHandle, dirTree, currentDirPath, setDirTree]);

  return { createJsonFile };
}
