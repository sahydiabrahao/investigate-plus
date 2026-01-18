import type { DirNode } from '@/utils/read-directory-tree';
import { TreeView } from '@/app/components/tree-view/TreeView';
import './TreePanel.scss';

type Props = {
  dirTree: DirNode | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;

  onFileClick?: (handle: FileSystemFileHandle, parentDirPath: string | null) => void;

  onDirClick?: (node: DirNode) => void;
};

export function TreePanel({ dirTree, expanded, onToggle, onFileClick, onDirClick }: Props) {
  return (
    <div className='tree-panel'>
      {!dirTree && <div className='tree-panel__empty'>Nenhuma pasta importada.</div>}

      {dirTree && (
        <TreeView
          root={dirTree}
          expanded={expanded}
          onToggle={onToggle}
          onFileClick={onFileClick}
          onDirClick={onDirClick}
        />
      )}
    </div>
  );
}
