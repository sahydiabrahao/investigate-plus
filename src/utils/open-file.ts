function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';

  if (lower.endsWith('.pdf')) return 'application/pdf';

  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';

  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.flac')) return 'audio/flac';

  return 'application/octet-stream';
}

export async function openFileInNewTab(fileHandle: FileSystemFileHandle, fileName: string) {
  const file = await fileHandle.getFile();
  const type = file.type && file.type.trim().length > 0 ? file.type : guessMimeType(fileName);
  const blob = type === file.type ? file : new Blob([file], { type });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function getFileHandleByRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error('Invalid path');

  let current: FileSystemDirectoryHandle = root;
  for (const dir of parts) {
    current = await current.getDirectoryHandle(dir);
  }

  return await current.getFileHandle(fileName);
}

export function toRelativePathFromRoot(rootName: string, fullPath: string): string {
  if (!fullPath) return '';
  if (fullPath === rootName) return '';
  const prefix = `${rootName}/`;
  if (fullPath.startsWith(prefix)) return fullPath.slice(prefix.length);
  return fullPath;
}
