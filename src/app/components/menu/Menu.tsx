import { useEffect, useMemo, useState } from 'react';
import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TreeNode =
  | {
      type: 'directory';
      name: string;
      path: string;
      children?: TreeNode[] | undefined;
      handle?: FileSystemDirectoryHandle;
    }
  | {
      type: 'file';
      name: string;
      path: string;
      handle?: FileSystemFileHandle;
    };

const INVESTIGATION_FILE = 'investigacao.json';

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';

  if (lower.endsWith('.pdf')) return 'application/pdf';

  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';

  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.flac')) return 'audio/flac';

  return 'application/octet-stream';
}

async function openFileInNewTab(fileHandle: FileSystemFileHandle, fileName: string) {
  const file = await fileHandle.getFile();

  const type = file.type && file.type.trim().length > 0 ? file.type : guessMimeType(fileName);

  const blob = type === file.type ? file : new Blob([file], { type });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function toRelativePathFromRoot(rootName: string, fullPath: string): string {
  if (!fullPath) return '';
  if (fullPath === rootName) return '';
  const prefix = `${rootName}/`;
  if (fullPath.startsWith(prefix)) return fullPath.slice(prefix.length);
  return fullPath;
}

async function getFileHandleByRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error('Invalid path');

  let current: FileSystemDirectoryHandle = root;

  for (const dir of parts) {
    current = await current.getDirectoryHandle(dir);
  }

  return await current.getFileHandle(fileName);
}

export function Menu() {
  const { dirTree, selectedCasePath, selectCase, rootHandle } = useWorkspace();

  return (
    <nav className='menu'>
      <div className='menu__header'>
        <span className='menu__title'>INVESTIGATE</span>
      </div>

      <div className='menu__content'>
        {!dirTree ? (
          <div className='menu__empty'>
            <span className='menu__empty-title'>Nenhuma pasta importada</span>
            <span className='menu__empty-subtitle'>
              Use o botão <strong>Import</strong> para escolher uma pasta.
            </span>
          </div>
        ) : (
          <ul className='menu__list'>
            <TreeItem
              node={dirTree as TreeNode}
              level={0}
              selectedCasePath={selectedCasePath}
              onSelectCase={selectCase}
              rootHandle={rootHandle}
            />
          </ul>
        )}
      </div>
    </nav>
  );
}

function TreeItem({
  node,
  level,
  selectedCasePath,
  onSelectCase,
  rootHandle,
}: {
  node: TreeNode;
  level: number;
  selectedCasePath: string | null;
  onSelectCase: (path: string) => void;
  rootHandle: FileSystemDirectoryHandle | null;
}) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);

  const isCaseCandidate = isDir && level === 1;

  const shouldAutoOpen = useMemo(() => {
    if (!isDir) return false;
    if (!selectedCasePath) return false;

    return selectedCasePath === node.path || selectedCasePath.startsWith(`${node.path}/`);
  }, [isDir, selectedCasePath, node.path]);

  const [isOpen, setIsOpen] = useState<boolean>(shouldAutoOpen);

  useEffect(() => {
    if (shouldAutoOpen) setIsOpen(true);
  }, [shouldAutoOpen]);

  const hasInvestigationFile =
    isCaseCandidate &&
    (node.children ?? []).some(
      (child) => child.type === 'file' && child.name === INVESTIGATION_FILE,
    );

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (isDir) {
      setIsOpen((prev) => !prev);

      if (isCaseCandidate) {
        onSelectCase(node.path);
      }

      return;
    }

    if (node.name === INVESTIGATION_FILE) return;

    if (node.handle) {
      try {
        await openFileInNewTab(node.handle, node.name);
        return;
      } catch (e) {
        console.error('open by handle failed, fallback to path', e);
      }
    }

    if (!rootHandle) return;

    try {
      const rel = toRelativePathFromRoot(rootHandle.name, node.path);
      const fh = await getFileHandleByRelativePath(rootHandle, rel);
      await openFileInNewTab(fh, node.name);
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenInvestigation() {
    onSelectCase(node.path);
  }

  const isActiveCase = isCaseCandidate && selectedCasePath === node.path;

  const visibleChildren = isDir
    ? (node.children ?? []).filter((child) => {
        if (child.type !== 'file') return true;
        if (isCaseCandidate && child.name === INVESTIGATION_FILE) return false;
        return true;
      })
    : [];

  return (
    <>
      <li className='menu__row' style={{ '--level': visualLevel } as React.CSSProperties}>
        <button
          type='button'
          className={`menu__item ${isActiveCase ? 'menu__item--active' : ''}`}
          onClick={(e) => handleClick(e)}
          aria-expanded={isDir ? isOpen : undefined}
          aria-current={isActiveCase ? 'true' : undefined}
        >
          <span className='menu__caret'>{isDir ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className='menu__icon'>{isDir ? '📁' : '📄'}</span>
          <span className='menu__label'>{node.name}</span>
        </button>
      </li>

      {isDir && isOpen && (
        <>
          {hasInvestigationFile && (
            <li className='menu__row' style={{ '--level': visualLevel + 1 } as React.CSSProperties}>
              <button
                type='button'
                className='menu__item menu__item--investigation'
                onClick={handleOpenInvestigation}
              >
                <span className='menu__caret' />
                <span className='menu__icon'>📌</span>
                <span className='menu__label'>Investigação</span>
              </button>
            </li>
          )}

          {visibleChildren.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedCasePath={selectedCasePath}
              onSelectCase={onSelectCase}
              rootHandle={rootHandle}
            />
          ))}
        </>
      )}
    </>
  );
}
