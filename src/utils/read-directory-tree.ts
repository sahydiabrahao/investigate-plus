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
  children: Array<DirNode | FileNode>;
};

export async function scanDirectoryTree(
  handle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<DirNode> {
  const name = handle.name;
  const path = basePath ? `${basePath}/${name}` : name;

  const children: Array<DirNode | FileNode> = [];

  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') {
      const dir = await scanDirectoryTree(entry, path);
      children.push(dir);
    }

    if (entry.kind === 'file') {
      children.push({
        type: 'file',
        name: entry.name,
        path: `${path}/${entry.name}`,
        handle: entry,
      });
    }
  }

  return {
    type: 'directory',
    name,
    path,
    children,
  };
}
