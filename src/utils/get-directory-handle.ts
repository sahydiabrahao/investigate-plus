export async function getDirectoryHandleByRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = relativePath.split('/').filter(Boolean);

  let current: FileSystemDirectoryHandle = root;

  for (const dir of parts) {
    current = await current.getDirectoryHandle(dir);
  }

  return current;
}
