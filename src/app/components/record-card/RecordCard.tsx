import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaseRecord } from '@/types/json-default';
import { ButtonText } from '@/app/components/button-text/ButtonText';
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

type ActiveReference = {
  fileName: string;
  startIndex: number;
} | null;

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
  const [activeRef, setActiveRef] = useState<ActiveReference>(null);
  const [linkPos, setLinkPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorWrapperRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<HTMLSpanElement | null>(null);

  const update = useCallback(
    (patch: Partial<CaseRecord>) => {
      onChange?.({ ...record, ...patch });
    },
    [record, onChange]
  );

  const handleTarget = (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ target: e.target.value });

  function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  const handleDetails = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    autoResize(e.target);
    update({ details: e.target.value });
    updateActiveReference();
  };

  function updateActiveReference() {
    const el = detailsRef.current;
    if (!el) {
      setActiveRef(null);
      return;
    }
    const value = el.value;
    const cursor = el.selectionStart ?? 0;
    const regex = /\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null = null;
    let found: ActiveReference = null;

    while ((match = regex.exec(value))) {
      const start = match.index;
      const end = start + match[0].length;
      if (cursor >= start && cursor <= end) {
        found = { fileName: match[1], startIndex: end };
        break;
      }
    }
    setActiveRef(found);
  }

  useEffect(() => {
    if (!activeRef || !mirrorWrapperRef.current || !markerRef.current) {
      setLinkPos(null);
      return;
    }
    const wrapperRect = mirrorWrapperRef.current.getBoundingClientRect();
    const markerRect = markerRef.current.getBoundingClientRect();
    const offsetY = 0;
    setLinkPos({
      top: markerRect.top - wrapperRect.top - offsetY,
      left: markerRect.left - wrapperRect.left,
    });
  }, [activeRef, record.details]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
  const handleOpenReference = () => {
    if (activeRef && onOpenReference) {
      onOpenReference(activeRef.fileName);
    }
  };

  useEffect(() => {
    function handleClickOutsideCard(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setActiveRef(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideCard);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideCard);
    };
  }, []);

  const mirrorPrefix =
    activeRef && activeRef.startIndex >= 0 ? record.details.slice(0, activeRef.startIndex) : '';

  return (
    <article className='record-card' ref={containerRef}>
      <div className='record-card__header'>
        <h2 className='record-card__label'>#</h2>

        <input
          className='record-card__target'
          value={record.target}
          onChange={handleTarget}
          placeholder='Ex: CPF, Telefone, PIX...'
        />

        <div className='record-card__header-actions'>
          <ButtonText
            text={collapsed ? '▾' : '▴'}
            size='sm'
            variant='outline'
            onClick={() => setCollapsed((prev) => !prev)}
          />

          <div className='record-card__menu' ref={menuRef}>
            <ButtonText
              text='⋯'
              size='sm'
              variant='outline'
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
        <div className='record-card__section' ref={mirrorWrapperRef}>
          <textarea
            ref={detailsRef}
            className='record-card__details'
            value={record.details}
            onChange={handleDetails}
            onClick={updateActiveReference}
            onKeyUp={updateActiveReference}
            onSelect={updateActiveReference}
            placeholder='[✔️] # OFÍCIO: Nome;'
            rows={1}
          />

          {activeRef && (
            <div className='record-card__details-mirror' aria-hidden='true'>
              {mirrorPrefix}
              <span ref={markerRef} />
            </div>
          )}

          {activeRef && linkPos && (
            <button
              type='button'
              className='record-card__link-hint'
              style={{ top: linkPos.top, left: linkPos.left }}
              onClick={handleOpenReference}
              title={`Abrir "${activeRef.fileName}"`}
            >
              🔗 Abrir
            </button>
          )}
        </div>
      )}
    </article>
  );
}
