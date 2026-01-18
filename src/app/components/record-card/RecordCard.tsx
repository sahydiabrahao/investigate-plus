import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaseRecord } from '@/types/json-default';
import { ButtonText, TextEditor } from '@/app/components';
import './RecordCard.scss';

type RecordCardProps = {
  record: CaseRecord;
  onChange?: (updated: CaseRecord) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onOpenReference?: (fileName: string) => void;
};

type ActiveLink = {
  refId: string;
  rect: DOMRect;
  index?: number; // opcional: fallback/diagnóstico para legado
} | null;

function isLegacyRefId(refId: string) {
  return refId.startsWith('legacy:');
}

function getLegacyIndex(refId: string): number | null {
  if (!isLegacyRefId(refId)) return null;
  const raw = refId.slice('legacy:'.length);
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function RecordCard({
  record,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onOpenReference,
}: RecordCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeLink, setActiveLink] = useState<ActiveLink>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // LEGADO: ainda mantemos para não quebrar casos antigos
  const [linkFiles, setLinkFiles] = useState<string[]>(record.linkFiles ?? []);

  const update = useCallback(
    (patch: Partial<CaseRecord>) => {
      onChange?.({ ...record, ...patch });
    },
    [record, onChange],
  );

  useEffect(() => {
    const matches = record.details.match(/\[🔗\]/g) ?? [];
    const count = matches.length;

    setLinkFiles((prev) => {
      const next = [...prev];
      while (next.length < count) next.push('');
      if (next.length > count) next.length = count;

      if (next.length !== (record.linkFiles ?? []).length) {
        update({ linkFiles: next });
      }

      return next;
    });
  }, [record.details, record.linkFiles, update]);

  useEffect(() => {
    setLinkFiles(record.linkFiles ?? []);
  }, [record.linkFiles]);

  useEffect(() => {
    function handleClickOutsideMenu(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutsideMenu);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideMenu);
  }, [menuOpen]);

  const handleDelete = () => {
    if (confirm('Deseja excluir este registro?')) {
      onDelete?.();
      setMenuOpen(false);
    }
  };

  const handleMoveUpClick = () => {
    if (onMoveUp && !isFirst) onMoveUp();
    setMenuOpen(false);
  };

  const handleMoveDownClick = () => {
    if (onMoveDown && !isLast) onMoveDown();
    setMenuOpen(false);
  };

  const getCurrentFileName = (refId: string): string => {
    const byId = record.linkFilesById?.[refId];
    if (byId) return byId;

    // Legado (quando o token não tem id)
    const legacyIndex = getLegacyIndex(refId);
    if (legacyIndex === null) return '';

    return linkFiles[legacyIndex] || '';
  };

  const setFileNameForRefId = (refId: string, fileName: string) => {
    const trimmed = fileName.trim();
    if (!trimmed) return;

    // Se for legado: mantém o comportamento antigo (por compat)
    const legacyIndex = getLegacyIndex(refId);
    if (legacyIndex !== null) {
      const next = [...linkFiles];
      next[legacyIndex] = trimmed;
      setLinkFiles(next);
      update({ linkFiles: next });
      return;
    }

    const nextById = { ...(record.linkFilesById ?? {}) };
    nextById[refId] = trimmed;
    update({ linkFilesById: nextById });
  };

  const handleOpenReference = (refId: string) => {
    const currentFileName = getCurrentFileName(refId);

    if (!currentFileName) {
      const name = window.prompt('Informe o nome do arquivo (ex: arquivo.pdf):');
      if (!name) return;

      setFileNameForRefId(refId, name);

      onOpenReference?.(name.trim());
      return;
    }

    onOpenReference?.(currentFileName);
  };

  useEffect(() => {
    function handleClickOutsideCard(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest('.record-card__link-hint')) {
        return;
      }

      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setActiveLink(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutsideCard);
    return () => document.removeEventListener('mousedown', handleClickOutsideCard);
  }, []);

  const currentFileName = activeLink ? getCurrentFileName(activeLink.refId) : '';

  return (
    <article className='record-card' ref={containerRef}>
      <div className='record-card__header'>
        <div className='record-card__target'>
          <TextEditor
            plainValue={record.target}
            richValue={record.targetRich}
            onChange={(plain, rich) => update({ target: plain, targetRich: rich })}
            placeholder='Ex: # NOME...; Use Ctrl+B para negrito.'
          />
        </div>

        <div className='record-card__header-actions'>
          <ButtonText
            text={collapsed ? '▾' : '▴'}
            size='sm'
            variant='default'
            onClick={() => setCollapsed((prev) => !prev)}
          />

          <div className='record-card__menu' ref={menuRef}>
            <ButtonText
              text='⋯'
              size='sm'
              variant='default'
              onClick={() => setMenuOpen((prev) => !prev)}
            />

            {menuOpen && (
              <div className='record-card__menu-dropdown'>
                <button
                  type='button'
                  className='record-card__menu-item'
                  onClick={handleMoveUpClick}
                  disabled={isFirst}
                >
                  🔺 Mover para cima
                </button>

                <button
                  type='button'
                  className='record-card__menu-item'
                  onClick={handleMoveDownClick}
                  disabled={isLast}
                >
                  🔻 Mover para baixo
                </button>

                <button
                  type='button'
                  className='record-card__menu-item record-card__menu-item--danger'
                  onClick={handleDelete}
                >
                  🗑️ Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className='record-card__section'>
          <TextEditor
            plainValue={record.details}
            richValue={record.detailsRich}
            onChange={(plain, rich) => update({ details: plain, detailsRich: rich })}
            placeholder='[✔️] # TÍTULO: Descrição; Use [🔗] para links.'
            onActiveLinkChange={setActiveLink}
            showToolbar
          />
        </div>
      )}

      {activeLink && (
        <button
          type='button'
          className='record-card__link-hint'
          style={{
            position: 'fixed',
            top: activeLink.rect.bottom - 16,
            left: activeLink.rect.right + 2,
          }}
          onClick={() => handleOpenReference(activeLink.refId)}
          title={currentFileName ? `Abrir "${currentFileName}"` : 'Definir arquivo'}
        >
          🔗 {currentFileName ? 'Abrir' : 'Definir arquivo'}
        </button>
      )}
    </article>
  );
}
