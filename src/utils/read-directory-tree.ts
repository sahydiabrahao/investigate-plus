export type FileNode = {
  type: 'file';
  name: string;
  path: string;
  handle: FileSystemFileHandle;
};

export type DirNode = {
  type: 'directory';
  name: string;
  path: string;
  children: NodeItem[];
};

export type NodeItem = FileNode | DirNode;

export async function scanDirectoryTree(
  dirHandle: FileSystemDirectoryHandle,
  basePath = ''
): Promise<DirNode> {
  const path = basePath ? `${basePath}/${dirHandle.name}` : dirHandle.name;
  const children: NodeItem[] = [];

  const entries = dirHandle.entries() as AsyncIterable<[string, FileSystemHandle]>;
  const dirs: [string, FileSystemDirectoryHandle][] = [];
  const files: [string, FileSystemFileHandle][] = [];

  for await (const [name, handle] of entries) {
    if (handle.kind === 'directory') {
      dirs.push([name, handle as FileSystemDirectoryHandle]);
    } else {
      files.push([name, handle as FileSystemFileHandle]);
    }
  }

  dirs.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  files.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

  for (const [name, fileHandle] of files) {
    const childPath = `${path}/${name}`;
    const fileNode: FileNode = {
      type: 'file',
      name,
      path: childPath,
      handle: fileHandle,
    };
    children.push(fileNode);
  }

  for (const [, sub] of dirs) {
    children.push(await scanDirectoryTree(sub, path));
  }

  return { type: 'directory', name: dirHandle.name, path, children };
}

export function renderTreeAsLines(node: NodeItem, depth = 0, out: string[] = []): string[] {
  const hyphens = depth > 0 ? '-'.repeat(depth) : '';
  if (node.type === 'file') {
    out.push(`${hyphens}📄${node.name}`);
    return out;
  }
  out.push(`${hyphens}📁${node.name}`);
  for (const child of node.children) renderTreeAsLines(child, depth + 1, out);
  return out;
}
