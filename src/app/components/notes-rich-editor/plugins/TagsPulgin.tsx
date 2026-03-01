import './TagsPlugin.scss';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import type { RangeSelection } from 'lexical';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND } from 'lexical';

import { useTags } from '@/app/hooks/useTags';
import { $createTagNode } from '@/app/components/notes-rich-editor/tag-node/TagNode';

type Match = {
  open: boolean;
  query: string;
  tokenLen: number;
  rect: DOMRect | null;
};

function isCollapsedRange(sel: RangeSelection) {
  return sel.anchor.key === sel.focus.key && sel.anchor.offset === sel.focus.offset;
}

function computeTagMatchFromNativeSelection(): Omit<Match, 'rect'> {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { open: false, query: '', tokenLen: 0 };

  const range = sel.getRangeAt(0);
  if (!range.collapsed) return { open: false, query: '', tokenLen: 0 };

  const node = range.startContainer;
  if (!node) return { open: false, query: '', tokenLen: 0 };

  const rawText =
    node.nodeType === Node.TEXT_NODE ? (node.textContent ?? '') : (node.textContent ?? '');
  const cursorOffset = range.startOffset;

  const before = rawText.slice(0, cursorOffset);

  if (!before.includes('#')) return { open: false, query: '', tokenLen: 0 };
  if (/\s$/.test(before)) return { open: false, query: '', tokenLen: 0 };

  const hashIndex = before.lastIndexOf('#');
  const charBefore = hashIndex > 0 ? before[hashIndex - 1] : '';

  const validBoundary = hashIndex === 0 || /\s/.test(charBefore);
  if (!validBoundary) return { open: false, query: '', tokenLen: 0 };

  const token = before.slice(hashIndex);
  if (/\s/.test(token)) return { open: false, query: '', tokenLen: 0 };

  const query = token.slice(1);

  return {
    open: true,
    query,
    tokenLen: token.length,
  };
}

function getCaretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const rects = range.getClientRects();
  if (rects.length > 0) return rects[0];

  const r = range.getBoundingClientRect();
  if (r && (r.width > 0 || r.height > 0)) return r;

  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TagsPlugin() {
  const [editor] = useLexicalComposerContext();
  const { items } = useTags();

  const [match, setMatch] = useState<Match>({
    open: false,
    query: '',
    tokenLen: 0,
    rect: null,
  });

  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = match.query.trim().toLowerCase();
    const list = items.map((x) => ({ ...x, labelNorm: x.label.toLowerCase() }));

    if (!q) return list;

    const starts: typeof list = [];
    const contains: typeof list = [];

    for (const it of list) {
      const hitStarts = it.labelNorm.startsWith(q);
      const hitContains = !hitStarts && it.labelNorm.includes(q);

      if (hitStarts) starts.push(it);
      else if (hitContains) contains.push(it);
    }

    return [...starts, ...contains];
  }, [items, match.query]);

  function close() {
    setMatch({ open: false, query: '', tokenLen: 0, rect: null });
    setActiveIndex(0);
  }

  function applyTag(tagId: string | number, tokenLen: number) {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      if (!isCollapsedRange(sel)) return;

      for (let i = 0; i < tokenLen; i++) {
        sel.deleteCharacter(true);
      }

      sel.insertNodes([
        $createTagNode({
          tagId: String(tagId),
          description: '',
        }),
      ]);

      sel.insertText(' ');
    });
  }

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) {
          if (match.open) close();
          return;
        }

        const next = computeTagMatchFromNativeSelection();
        if (!next.open) {
          if (match.open) close();
          return;
        }

        const rect = getCaretRect();
        setMatch({
          open: true,
          query: next.query,
          tokenLen: next.tokenLen,
          rect,
        });

        setActiveIndex((prevIndex) => {
          const max = Math.max(0, filtered.length - 1);
          return Math.min(prevIndex, max);
        });
      });
    });
  }, [editor, filtered.length, match.open]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!match.open) return false;

        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
          return true;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          setActiveIndex((i) => Math.max(i - 1, 0));
          return true;
        }

        if (event.key === 'Enter') {
          const picked = filtered[activeIndex];
          if (!picked) return false;

          event.preventDefault();
          event.stopPropagation();

          applyTag(picked.id, match.tokenLen);
          close();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, match.open, match.tokenLen, filtered, activeIndex]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!match.open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inside = rootRef.current?.contains(t) ?? false;
      if (!inside) close();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [match.open]);

  if (!match.open || !match.rect) return null;

  const popW = 420;
  const margin = 8;

  const left = clamp(Math.round(match.rect.left), margin, window.innerWidth - popW - margin);
  const top = clamp(Math.round(match.rect.bottom + 6), margin, window.innerHeight - 180);

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
  };

  return createPortal(
    <div className='tags-commands' ref={rootRef} style={style} role='menu' aria-label='Tags'>
      {filtered.length === 0 ? (
        <div className='tags-commands__empty'>Nenhuma tag</div>
      ) : (
        <div className='tags-commands__list'>
          {filtered.map((it, idx) => (
            <button
              key={it.id}
              type='button'
              className={`tags-commands__item ${idx === activeIndex ? 'is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyTag(it.id, match.tokenLen);
                close();
              }}
              title='Aplicar'
            >
              <span className={`tags-commands__chip tags-commands__chip--s${it.styleId}`}>
                {it.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
