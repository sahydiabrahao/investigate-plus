import { useState } from 'react';
import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TreeNode = {
  type: 'directory' | 'file';
  name: string;
  path: string;
  children?: TreeNode[] | undefined;
};

export function Menu() {
  const { dirTree } = useWorkspace();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

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
              onSelectFile={setSelectedPath}
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
  onSelectFile,
}: {
  node: TreeNode;
  level: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);

  const [isOpen, setIsOpen] = useState(false);

  function handleClick() {
    if (isDir) {
      setIsOpen((prev) => !prev);
      return;
    }

    onSelectFile(node.path);
  }

  const isActive = selectedPath === node.path;

  return (
    <>
      <li className='menu__row' style={{ '--level': visualLevel } as React.CSSProperties}>
        <button
          type='button'
          className={`menu__item ${isActive ? 'menu__item--active' : ''}`}
          onClick={handleClick}
          aria-expanded={isDir ? isOpen : undefined}
          aria-current={!isDir && isActive ? 'true' : undefined}
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
            onSelectFile={onSelectFile}
          />
        ))}
    </>
  );
}
