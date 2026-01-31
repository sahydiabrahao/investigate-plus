import { useEffect, useMemo, useState } from 'react';
import './Menu.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  openFileInNewTab,
  getFileHandleByRelativePath,
  toRelativePathFromRoot,
} from '@/utils/open-file';
import {
  INVESTIGATION_FILE,
  STATUS_SUGGESTIONS,
  type CaseStatus,
} from '@/constants/investigation.constants';
import { CheckIcon, ReviewIcon, UrgentIcon, PendingIcon, WaitingIcon, NullIcon } from '@/app/icons';

type TreeNode =
  | {
      type: 'directory';
      name: string;
      path: string;
      children?: TreeNode[] | undefined;
      handle?: FileSystemDirectoryHandle;
    }
  | {
      type: 'file';
      name: string;
      path: string;
      handle?: FileSystemFileHandle;
    };

function statusDataValue(s: CaseStatus | null | undefined): string {
  return s ?? 'NONE';
}

function renderStatusIcon(s: CaseStatus | null | undefined, size = 18) {
  if (!s) return <NullIcon size={size} color='white' />;
  if (s === 'PENDENTE') return <PendingIcon size={size} color='white' />;
  if (s === 'ANALISAR') return <ReviewIcon size={size} />;
  if (s === 'CONCLUIDO') return <CheckIcon size={size} color='white' />;
  if (s === 'URGENTE') return <UrgentIcon size={size} color='white' />;
  if (s === 'AGUARDANDO') return <WaitingIcon size={size} color='white' />;
  return <NullIcon size={size} color='white' />;
}

function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'JSON inválido (não foi possível fazer parse).' };
  }
}

function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === 'string' && (STATUS_SUGGESTIONS as readonly string[]).includes(value);
}

async function readCaseStatusFromDir(
  caseDirHandle: FileSystemDirectoryHandle,
): Promise<CaseStatus | null> {
  try {
    const fh = await caseDirHandle.getFileHandle(INVESTIGATION_FILE);
    const file = await fh.getFile();
    const text = await file.text();

    const parsed = safeJsonParse(text);
    if (!parsed.ok) return null;

    const json = parsed.value as { status?: unknown };
    return isCaseStatus(json.status) ? json.status : null;
  } catch {
    return null;
  }
}

export function Menu() {
  const { dirTree, selectedCasePath, selectCase, rootHandle } = useWorkspace();
  const [statusByPath, setStatusByPath] = useState<Record<string, CaseStatus | null>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!dirTree) {
        setStatusByPath({});
        return;
      }

      const rootChildren = (dirTree.children ?? []).filter((c) => c.type === 'directory') as Array<
        TreeNode & { type: 'directory' }
      >;

      const entries = await Promise.all(
        rootChildren.map(async (caseNode) => {
          if (!caseNode.handle) return [caseNode.path, null] as const;
          const st = await readCaseStatusFromDir(caseNode.handle);
          return [caseNode.path, st] as const;
        }),
      );

      if (cancelled) return;

      const next: Record<string, CaseStatus | null> = {};
      for (const [p, st] of entries) next[p] = st;

      setStatusByPath(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [dirTree]);

  return (
    <nav className='menu'>
      <div className='menu__header'>
        <span className='menu__title'>INVESTIGATE</span>
      </div>

      <div className='menu__content'>
        {!dirTree ? (
          <div className='menu__empty'>
            <span className='menu__empty-title'>Nenhuma pasta importada</span>
            <span className='menu__empty-subtitle'>
              Use o botão <strong>Import</strong> para escolher uma pasta.
            </span>
          </div>
        ) : (
          <ul className='menu__list'>
            <TreeItem
              node={dirTree as TreeNode}
              level={0}
              selectedCasePath={selectedCasePath}
              onSelectCase={selectCase}
              rootHandle={rootHandle}
              statusByPath={statusByPath}
            />
          </ul>
        )}
      </div>
    </nav>
  );
}

function TreeItem({
  node,
  level,
  selectedCasePath,
  onSelectCase,
  rootHandle,
  statusByPath,
}: {
  node: TreeNode;
  level: number;
  selectedCasePath: string | null;
  onSelectCase: (path: string) => void;
  rootHandle: FileSystemDirectoryHandle | null;
  statusByPath: Record<string, CaseStatus | null>;
}) {
  const isDir = node.type === 'directory';
  const visualLevel = Math.max(level - 1, 0);

  const isCaseCandidate = isDir && level === 1;

  const shouldAutoOpen = useMemo(() => {
    if (!isDir) return false;
    if (!selectedCasePath) return false;

    return selectedCasePath === node.path || selectedCasePath.startsWith(`${node.path}/`);
  }, [isDir, selectedCasePath, node.path]);

  const [isOpen, setIsOpen] = useState<boolean>(shouldAutoOpen);

  useEffect(() => {
    if (shouldAutoOpen) setIsOpen(true);
  }, [shouldAutoOpen]);

  const hasInvestigationFile =
    isCaseCandidate &&
    (node.children ?? []).some(
      (child) => child.type === 'file' && child.name === INVESTIGATION_FILE,
    );

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (isDir) {
      setIsOpen((prev) => !prev);

      if (isCaseCandidate) {
        onSelectCase(node.path);
      }

      return;
    }

    if (node.name === INVESTIGATION_FILE) return;

    if (node.handle) {
      try {
        await openFileInNewTab(node.handle, node.name);
        return;
      } catch (e) {
        console.error('open by handle failed, fallback to path', e);
      }
    }

    if (!rootHandle) return;

    try {
      const rel = toRelativePathFromRoot(rootHandle.name, node.path);
      const fh = await getFileHandleByRelativePath(rootHandle, rel);
      await openFileInNewTab(fh, node.name);
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenInvestigation() {
    onSelectCase(node.path);
  }

  const isActiveCase = isCaseCandidate && selectedCasePath === node.path;

  const visibleChildren = isDir
    ? (node.children ?? []).filter((child) => {
        if (child.type !== 'file') return true;
        if (isCaseCandidate && child.name === INVESTIGATION_FILE) return false;
        return true;
      })
    : [];

  const caseStatus = isCaseCandidate ? (statusByPath[node.path] ?? null) : null;

  return (
    <>
      <li className='menu__row' style={{ '--level': visualLevel } as React.CSSProperties}>
        <button
          type='button'
          className={`menu__item ${isActiveCase ? 'menu__item--active' : ''}`.trim()}
          onClick={(e) => handleClick(e)}
          aria-expanded={isDir ? isOpen : undefined}
          aria-current={isActiveCase ? 'true' : undefined}
        >
          <span className='menu__caret'>{isDir ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className='menu__icon'>{isDir ? '📁' : '📄'}</span>
          <span className='menu__label'>{node.name}</span>

          {isCaseCandidate && (
            <span className='menu__status' data-status={statusDataValue(caseStatus)} aria-hidden>
              {renderStatusIcon(caseStatus, 18)}
            </span>
          )}
        </button>
      </li>

      {isDir && isOpen && (
        <>
          {hasInvestigationFile && (
            <li className='menu__row' style={{ '--level': visualLevel + 1 } as React.CSSProperties}>
              <button
                type='button'
                className='menu__item menu__item--investigation'
                onClick={handleOpenInvestigation}
              >
                <span className='menu__caret' />
                <span className='menu__icon'>📌</span>
                <span className='menu__label'>Investigação</span>
              </button>
            </li>
          )}

          {visibleChildren.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedCasePath={selectedCasePath}
              onSelectCase={onSelectCase}
              rootHandle={rootHandle}
              statusByPath={statusByPath}
            />
          ))}
        </>
      )}
    </>
  );
}
