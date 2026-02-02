import { useEffect, useMemo, useState } from 'react';
import './Menu.scss';

import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { DirNode, FileNode } from '@/utils/read-directory-tree';

import {
  openFileInNewTab,
  getFileHandleByRelativePath,
  toRelativePathFromRoot,
} from '@/utils/open-file';

import { INVESTIGATION_FILE, type CaseStatus } from '@/constants/investigation.constants';

import { CheckIcon, ReviewIcon, UrgentIcon, PendingIcon, WaitingIcon, NullIcon } from '@/app/icons';

type DirNodeWithStatus = Omit<DirNode, 'children'> & {
  status?: CaseStatus | null;
  children: Array<DirNodeWithStatus | FileNode>;
};

type TreeNode = DirNodeWithStatus | FileNode;

function statusDataValue(s: CaseStatus | null | undefined): string {
  return s ?? 'NONE';
}

function renderStatusIcon(s: CaseStatus | null | undefined, size = 18) {
  if (!s) return <NullIcon size={size} color='white' />;
  if (s === 'PENDENTE') return <PendingIcon size={size} color='white' />;
  if (s === 'ANALISAR') return <ReviewIcon size={size} color='white' />;
  if (s === 'CONCLUIDO') return <CheckIcon size={size} color='white' />;
  if (s === 'URGENTE') return <UrgentIcon size={size} color='white' />;
  if (s === 'AGUARDANDO') return <WaitingIcon size={size} color='white' />;
  return <NullIcon size={size} color='white' />;
}

export function Menu() {
  const { dirTree, selectedCasePath, selectCase, rootHandle } = useWorkspace();

  return (
    <nav className='menu'>
      <div className='menu__header'>
        <span className='menu__title'>INVESTIGATE+</span>
      </div>

      <div className='menu__content'>
        {!dirTree ? (
          <div className='menu__empty'>
            <span className='menu__empty-title'>Nenhuma pasta importada. </span>
            <span className='menu__empty-subtitle'>
              Use o botão <strong>Import</strong> para escolher uma pasta.
            </span>
          </div>
        ) : (
          <ul className='menu__list'>
            <TreeItem
              node={dirTree as unknown as DirNodeWithStatus}
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
  onSelectCase: (path: string | null) => void;
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
    (isDir ? node.children : []).some(
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

    try {
      await openFileInNewTab(node.handle, node.name);
      return;
    } catch {
      //ignore
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
    if (!isDir) return;
    onSelectCase(node.path);
  }

  const isActiveCase = isCaseCandidate && selectedCasePath === node.path;

  const visibleChildren = isDir
    ? node.children.filter((child) => {
        if (child.type !== 'file') return true;
        if (isCaseCandidate && child.name === INVESTIGATION_FILE) return false;
        return true;
      })
    : [];

  const caseStatus = isCaseCandidate && isDir ? (node.status ?? null) : null;

  return (
    <>
      <li className='menu__row' style={{ '--level': visualLevel } as React.CSSProperties}>
        <button
          type='button'
          className={`menu__item ${isActiveCase ? 'menu__item--active' : ''}`.trim()}
          onClick={(e) => handleClick(e)}
          aria-expanded={isDir ? isOpen : undefined}
          aria-current={isActiveCase ? 'true' : undefined}
        >
          <span className='menu__caret'>{isDir ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className='menu__icon'>{isDir ? '📁' : '📄'}</span>
          <span className='menu__label'>{node.name}</span>

          {isCaseCandidate && (
            <span className='menu__status' data-status={statusDataValue(caseStatus)} aria-hidden>
              {renderStatusIcon(caseStatus, 18)}
            </span>
          )}
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
