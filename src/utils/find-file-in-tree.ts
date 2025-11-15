import type { DirNode, NodeItem } from './read-directory-tree';

export function findFileInTree(root: DirNode, fileName: string): FileSystemFileHandle | null {
  const stack: NodeItem[] = [...root.children];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (node.type === 'file' && node.name === fileName) {
      return node.handle;
    }

    if (node.type === 'directory') {
      stack.push(...node.children);
    }
  }

  return null;
}
