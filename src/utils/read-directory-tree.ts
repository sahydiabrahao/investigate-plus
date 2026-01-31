import { INVESTIGATION_FILE, type CaseStatus } from '@/constants/investigation.constants';

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
  handle: FileSystemDirectoryHandle;
  children: Array<DirNode | FileNode>;
  status: CaseStatus | null;
};

async function readCaseStatus(caseDir: FileSystemDirectoryHandle): Promise<CaseStatus | null> {
  try {
    const fh = await caseDir.getFileHandle(INVESTIGATION_FILE);
    const file = await fh.getFile();
    const text = await file.text();

    const parsed = JSON.parse(text) as { status?: CaseStatus };
    return parsed?.status ?? null;
  } catch {
    return null;
  }
}

export async function scanDirectoryTree(
  handle: FileSystemDirectoryHandle,
  basePath = '',
  depth = 0,
): Promise<DirNode> {
  const name = handle.name;
  const path = basePath ? `${basePath}/${name}` : name;

  const children: Array<DirNode | FileNode> = [];

  let status: CaseStatus | null = null;
  if (depth === 1) {
    status = await readCaseStatus(handle);
  }

  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') {
      const dir = await scanDirectoryTree(entry, path, depth + 1);
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
    handle,
    children,
    status,
  };
}
