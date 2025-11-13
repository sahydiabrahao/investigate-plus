import { useEffect, useState } from 'react';
import './Menu.scss';
import { scanDirectoryTree } from '@/utils/read-directory-tree';
import type { DirNode } from '@/utils/read-directory-tree';
import { ButtonIcon } from '@/app/components/button-icon/ButtonIcon';
import { TreeView } from '@/app/components/tree-view/TreeView';
import { ImportIcon, ExpandIcon, CollapseIcon, FileJsonIcon } from '@/icons';
import { loadDirectoryHandle, saveDirectoryHandle } from '@/storage';

export function Menu() {
  const [dirTree, setDirTree] = useState<DirNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentDirPath, setCurrentDirPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const handle = await loadDirectoryHandle();
      if (!handle) return;
      const permission = await handle.queryPermission?.({ mode: 'readwrite' });
      if (permission === 'denied') return;
      if (permission !== 'granted') {
        const requestResult = await handle.requestPermission?.({ mode: 'readwrite' });
        if (requestResult !== 'granted') return;
      }
      const tree = await scanDirectoryTree(handle);
      setDirTree(tree);
      setRootHandle(handle);
      const initialExpanded = new Set<string>();
      initialExpanded.add(tree.path);
      setExpanded(initialExpanded);
      setCurrentDirPath(tree.path);
    })();
  }, []);

  async function handleImportFolder() {
    const dir = await window.showDirectoryPicker!({ mode: 'read' });
    await saveDirectoryHandle(dir);
    const tree = await scanDirectoryTree(dir);
    setDirTree(tree);
    const expanded = new Set<string>();
    expanded.add(tree.path);
    setExpanded(expanded);
  }

  function handleToggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function collectAllDirPaths(node: DirNode, acc: Set<string>) {
    acc.add(node.path);
    for (const child of node.children) {
      if (child.type === 'directory') {
        collectAllDirPaths(child, acc);
      }
    }
  }

  function handleExpandAll() {
    if (!dirTree) return;
    const all = new Set<string>();
    collectAllDirPaths(dirTree, all);
    setExpanded(all);
  }

  function handleCollapseAll() {
    setExpanded(new Set());
  }

  function handleDirClick(node: DirNode) {
    setCurrentDirPath(node.path);
  }

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

  async function handleCreateJson() {
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
  }

  return (
    <div className='menu'>
      <div className='menu__actions'>
        <ButtonIcon icon={ImportIcon} onClick={handleImportFolder} size='lg' />
        <ButtonIcon icon={FileJsonIcon} onClick={handleCreateJson} size='lg' />
        <ButtonIcon icon={ExpandIcon} onClick={handleExpandAll} size='lg' />
        <ButtonIcon icon={CollapseIcon} onClick={handleCollapseAll} size='lg' />
      </div>

      <div className='menu__list'>
        {!dirTree && <div className='menu__item menu__item--empty'>Nenhuma pasta importada</div>}

        {dirTree && (
          <TreeView
            root={dirTree}
            expanded={expanded}
            onToggle={handleToggle}
            onFileClick={async (handle) => {
              const file = await handle.getFile();
              const url = URL.createObjectURL(file);
              window.open(url, '_blank');
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            }}
            onDirClick={handleDirClick}
          />
        )}
      </div>
    </div>
  );
}
