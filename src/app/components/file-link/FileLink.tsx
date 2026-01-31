import './FileLink.scss';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { FileLinkData } from '@/types/file-link.types';
import { getFileHandleByRelativePath, openFileInNewTab } from '@/utils/open-file';

type FileLinkProps = {
  data: FileLinkData;
};

export default function FileLink({ data }: FileLinkProps) {
  const { rootHandle } = useWorkspace();
  const [isMissing, setIsMissing] = useState(false);

  const name = useMemo(() => {
    return data.displayName ?? data.relativePath.split('/').pop() ?? 'arquivo';
  }, [data.displayName, data.relativePath]);

  const fullRelativePath = useMemo(() => {
    const casePart = (data.casePath ?? '').replace(/\/+$/g, '');
    const relPart = (data.relativePath ?? '').replace(/^\/+/g, '');
    return casePart ? `${casePart}/${relPart}` : relPart;
  }, [data.casePath, data.relativePath]);

  async function handleOpen() {
    if (!rootHandle) return;

    try {
      const fh = await getFileHandleByRelativePath(rootHandle, fullRelativePath);
      await openFileInNewTab(fh, name);
      setIsMissing(false);
    } catch (e) {
      console.warn('FileLink: failed to open', { fullRelativePath, e });
      setIsMissing(true);
    }
  }

  return (
    <span
      className={`file-link ${isMissing ? 'file-link--missing' : ''}`}
      title={isMissing ? `Arquivo não encontrado: ${name}` : `Abrir: ${name}`}
      onClick={handleOpen}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void handleOpen();
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '1px 6px',
        borderRadius: 6,
        cursor: rootHandle ? 'pointer' : 'not-allowed',
        userSelect: 'none',
        opacity: rootHandle ? 1 : 0.6,
      }}
    >
      <span aria-hidden>{isMissing ? '⚠️' : '🔗'}</span>
    </span>
  );
}
