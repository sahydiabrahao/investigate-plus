import { useState } from 'react';
import { ButtonIcon } from '@/app/components/button-icon/ButtonIcon';
import { ImportIcon, ExpandIcon, CollapseIcon } from '@/icons';
import { scanDirectoryTree } from '@/utils/read-directory-tree';
import type { DirNode } from '@/utils/read-directory-tree';
import { TreeView } from '@/app/components/tree-view/TreeView';
import './Menu.scss';

export function Menu() {
  const [dirTree, setDirTree] = useState<DirNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function handleImportFolder() {
    const dir = await window.showDirectoryPicker!({ mode: 'read' });
    const tree = await scanDirectoryTree(dir);
    setDirTree(tree);
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

  return (
    <div className='menu'>
      <div className='menu__actions'>
        <ButtonIcon icon={ImportIcon} onClick={handleImportFolder} size='lg' />
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
            onFileClick={(handle) => {
              console.log('Arquivo clicado:', handle.name);
            }}
          />
        )}
      </div>
    </div>
  );
}
