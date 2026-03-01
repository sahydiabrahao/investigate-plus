import './TagChip.scss';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey } from 'lexical';
import { $isTagNode } from '@/app/components/notes-rich-editor/tag-node/TagNode';
import { useTags } from '@/app/hooks/useTags';

type TagChipProps = {
  tagId: string;
  description?: string;
  nodeKey: string;
};

function isEmojiLabel(label: string) {
  const s = label.trim();
  if (!s) return false;
  return [...s].length <= 2 && /\p{Extended_Pictographic}/u.test(s);
}

type PopoverPos = { left: number; top: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TagChip({ tagId, description, nodeKey }: TagChipProps) {
  const [editor] = useLexicalComposerContext();
  const { items } = useTags();

  const def = useMemo(() => items.find((x) => x.id === tagId) ?? null, [items, tagId]);

  const label = def?.label ?? '#?';
  const styleId = String(def?.styleId ?? 0);

  const chipRef = useRef<HTMLSpanElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(description ?? '');
  const [pos, setPos] = useState<PopoverPos | null>(null);

  const title = useMemo(() => {
    const v = description?.trim();
    if (!v) return label;
    return v;
  }, [description, label]);

  function computePos(): PopoverPos | null {
    const el = chipRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    const popW = 320;
    const margin = 8;

    const left = clamp(Math.round(rect.left), margin, window.innerWidth - popW - margin);
    const top = clamp(Math.round(rect.bottom + 8), margin, window.innerHeight - 160);

    return { left, top };
  }

  function openPopover() {
    setDraft(description ?? '');
    setPos(computePos());
    setOpen(true);
  }

  function closePopover() {
    setOpen(false);
  }

  function commit(next: string) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isTagNode(node)) return;
      node.setDescription(next);
    });
  }

  function save() {
    commit(draft);
    closePopover();
  }

  useEffect(() => {
    if (!open) return;

    const p = computePos();
    if (p) setPos(p);

    const onResizeOrScroll = () => {
      const next = computePos();
      if (next) setPos(next);
    };

    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;

      const insidePop = popRef.current?.contains(t) ?? false;
      const insideChip = chipRef.current?.contains(t) ?? false;

      if (!insidePop && !insideChip) closePopover();
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closePopover();
      }
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  return (
    <>
      <span
        ref={chipRef}
        className={`tag-chip tag-chip--s${styleId} tag-chip--clickable`}
        data-tag-id={tagId}
        title={title}
        role='button'
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openPopover();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openPopover();
          }
        }}
      >
        <span className='tag-chip__label' data-emoji={isEmojiLabel(label) ? 'true' : 'false'}>
          {label}
        </span>
      </span>

      {open && pos
        ? createPortal(
            <div
              ref={popRef}
              className='tag-chip-popover'
              style={{ position: 'fixed', left: pos.left, top: pos.top }}
              role='dialog'
              aria-label='Editar descrição'
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className='tag-chip-popover__title'>{label}</div>

              <label className='tag-chip-popover__label'>
                Descrição
                <input
                  ref={inputRef}
                  className='tag-chip-popover__input'
                  value={draft}
                  onChange={(e) => setDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      save();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      closePopover();
                    }
                  }}
                />
              </label>

              <div className='tag-chip-popover__actions'>
                <button
                  type='button'
                  className='tag-chip-popover__btn'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closePopover();
                  }}
                >
                  Cancelar
                </button>

                <button
                  type='button'
                  className='tag-chip-popover__btn tag-chip-popover__btn--primary'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    save();
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
