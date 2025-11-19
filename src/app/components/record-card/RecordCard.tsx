import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaseRecord } from '@/types/json-default';
import { ButtonText, EditorWithToolbar } from '@/app/components';
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
  index: number;
  rect: DOMRect;
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

  const [activeLink, setActiveLink] = useState<ActiveLink>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [linkFiles, setLinkFiles] = useState<string[]>(record.linkFiles ?? []);

  const update = useCallback(
    (patch: Partial<CaseRecord>) => {
      onChange?.({ ...record, ...patch });
    },
    [record, onChange]
  );

  const handleTarget = (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ target: e.target.value });

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

  const handleOpenReference = (index: number) => {
    const currentFileName = linkFiles[index] || '';

    if (!currentFileName) {
      const name = window.prompt('Informe o nome do arquivo (ex: arquivo.pdf):');
      if (!name) return;

      const next = [...linkFiles];
      next[index] = name.trim();
      setLinkFiles(next);
      update({ linkFiles: next });

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

  const currentFileName =
    activeLink && linkFiles[activeLink.index] ? linkFiles[activeLink.index] : '';

  return (
    <article className='record-card' ref={containerRef}>
      <div className='record-card__header'>
        <h2 className='record-card__label'>#</h2>

        <input
          className='record-card__target'
          value={record.target}
          onChange={handleTarget}
          placeholder='Ex: NOME...'
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
        <div className='record-card__section'>
          <EditorWithToolbar
            plainValue={record.details}
            richValue={record.detailsRich}
            onChange={(plain, rich) => update({ details: plain, detailsRich: rich })}
            placeholder='[✔️] # TÍTULO: Descrição; Use [🔗] para links.'
            onActiveLinkChange={setActiveLink}
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
          onClick={() => handleOpenReference(activeLink.index)}
          title={currentFileName ? `Abrir "${currentFileName}"` : 'Definir arquivo'}
        >
          🔗 {currentFileName ? 'Abrir' : 'Definir arquivo'}
        </button>
      )}
    </article>
  );
}
