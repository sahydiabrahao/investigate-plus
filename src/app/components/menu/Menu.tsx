import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TreeNode = {
  type: 'directory' | 'file';
  name: string;
  path: string;
  children?: TreeNode[];
};

export function Menu() {
  const { dirTree } = useWorkspace();

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
            <TreeItem node={dirTree as TreeNode} level={0} />
          </ul>
        )}
      </div>
    </nav>
  );
}

function TreeItem({ node, level }: { node: TreeNode; level: number }) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);
  return (
    <>
      <div className='menu__item' style={{ '--level': visualLevel } as React.CSSProperties}>
        <span className='menu__icon'>{isDir ? '📁' : '📄'}</span>
        <span className='menu__label'>{node.name}</span>
      </div>

      {isDir &&
        node.children?.map((child) => <TreeItem key={child.path} node={child} level={level + 1} />)}
    </>
  );
}
