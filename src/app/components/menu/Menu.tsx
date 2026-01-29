import { useState } from 'react';
import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TreeNode =
  | {
      type: 'directory';
      name: string;
      path: string;
      children?: TreeNode[] | undefined;
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
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

async function openFileInNewTab(fileHandle: FileSystemFileHandle, fileName: string) {
  const file = await fileHandle.getFile();

  const type = file.type && file.type.trim().length > 0 ? file.type : guessMimeType(fileName);

  const blob = type === file.type ? file : new Blob([file], { type });

  const url = URL.createObjectURL(blob);

  const opened = window.open(url, '_blank', 'noopener,noreferrer');

  if (!opened) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function Menu() {
  const { dirTree, selectedCasePath, selectCase } = useWorkspace();

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
}: {
  node: TreeNode;
  level: number;
  selectedCasePath: string | null;
  onSelectCase: (path: string) => void;
}) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);

  const isCaseCandidate = isDir && level === 1;

  const [isOpen, setIsOpen] = useState(false);

  const hasInvestigationFile =
    isCaseCandidate &&
    (node.children ?? []).some(
      (child) => child.type === 'file' && child.name === INVESTIGATION_FILE,
    );

  async function handleClick() {
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
      } catch (e) {
        console.error(e);
      }
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
          onClick={handleClick}
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
            />
          ))}
        </>
      )}
    </>
  );
}
