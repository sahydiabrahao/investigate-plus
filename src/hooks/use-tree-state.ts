import { useCallback, useEffect, useState } from 'react';
import type { DirNode } from '@/utils/read-directory-tree';

type UseTreeStateResult = {
  expanded: Set<string>;
  currentDirPath: string | null;
  handleToggle: (path: string) => void;
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  handleDirClick: (node: DirNode) => void;
};

export function useTreeState(dirTree: DirNode | null): UseTreeStateResult {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [currentDirPath, setCurrentDirPath] = useState<string | null>(null);

  useEffect(() => {
    if (!dirTree) return;

    const initial = new Set<string>();
    initial.add(dirTree.path);

    setExpanded(initial);
    setCurrentDirPath(dirTree.path);
  }, [dirTree]);

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (!dirTree) return;

    const collect = (node: DirNode, acc: Set<string>) => {
      acc.add(node.path);
      for (const child of node.children) {
        if (child.type === 'directory') {
          collect(child, acc);
        }
      }
    };

    const all = new Set<string>();
    collect(dirTree, all);

    setExpanded(all);
  }, [dirTree]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleDirClick = useCallback((node: DirNode) => {
    setCurrentDirPath(node.path);
  }, []);

  return {
    expanded,
    currentDirPath,
    handleToggle,
    handleExpandAll,
    handleCollapseAll,
    handleDirClick,
  };
}
