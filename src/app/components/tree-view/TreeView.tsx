import { useMemo } from 'react';
import type { DirNode } from '@/utils/read-directory-tree';
import { TreeNode } from '../tree-node/TreeNode';
import './TreeView.scss';

type TreeViewProps = {
  root: DirNode | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onFileClick?: (handle: FileSystemFileHandle) => void;
  onDirClick?: (node: DirNode) => void;
};

export function TreeView({ root, expanded, onToggle, onFileClick, onDirClick }: TreeViewProps) {
  const children = useMemo(() => root?.children ?? [], [root]);

  if (!root || !children.length) {
    return (
      <div className='tree tree--empty' role='tree' aria-label='Estrutura de arquivos'>
        <div className='tree__empty'>Nenhum arquivo carregado.</div>
      </div>
    );
  }

  return (
    <div className='tree' role='tree' aria-label='Estrutura de arquivos'>
      {children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={0}
          expanded={expanded}
          onToggle={onToggle}
          onFileClick={onFileClick}
          onDirClick={onDirClick}
        />
      ))}
    </div>
  );
}
