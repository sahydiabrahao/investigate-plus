import { useEffect, useMemo, useState } from 'react';
import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  openFileInNewTab,
  getFileHandleByRelativePath,
  toRelativePathFromRoot,
} from '@/utils/open-file';

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
