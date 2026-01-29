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

export function Menu() {
  const { dirTree, selectedPath, selectPath, selectedCasePath, selectCase } = useWorkspace();

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
              selectedPath={selectedPath}
              selectedCasePath={selectedCasePath}
              onSelectFile={selectPath}
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
  selectedPath,
  selectedCasePath,
  onSelectFile,
  onSelectCase,
}: {
  node: TreeNode;
  level: number;
  selectedPath: string | null;
  selectedCasePath: string | null;
  onSelectFile: (path: string) => void;
  onSelectCase: (path: string) => void;
}) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);
  const isCaseCandidate = isDir && level === 1;
  const [isOpen, setIsOpen] = useState(false);

  function handleClick() {
    if (isDir) {
      setIsOpen((prev) => !prev);

      if (isCaseCandidate) {
        onSelectCase(node.path);
      }

      return;
    }

    onSelectFile(node.path);
  }

  const isActiveFile = !isDir && selectedPath === node.path;
  const isActiveCase = isCaseCandidate && selectedCasePath === node.path;
  const isActive = isActiveFile || isActiveCase;

  return (
    <>
      <li className='menu__row' style={{ '--level': visualLevel } as React.CSSProperties}>
        <button
          type='button'
          className={`menu__item ${isActive ? 'menu__item--active' : ''}`}
          onClick={handleClick}
          aria-expanded={isDir ? isOpen : undefined}
          aria-current={!isDir && isActiveFile ? 'true' : undefined}
        >
          <span className='menu__caret'>{isDir ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className='menu__icon'>{isDir ? '📁' : '📄'}</span>
          <span className='menu__label'>{node.name}</span>
        </button>
      </li>

      {isDir &&
        isOpen &&
        node.children?.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            level={level + 1}
            selectedPath={selectedPath}
            selectedCasePath={selectedCasePath}
            onSelectFile={onSelectFile}
            onSelectCase={onSelectCase}
          />
        ))}
    </>
  );
}
