import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useTags } from '@/app/hooks/useTags';

type TagAutocompleteTextareaProps = {
  className?: string;
  value: string;
  onChangeValue: (next: string) => void;
  placeholder?: string;
  rows?: number;
};

type Match = {
  open: boolean;
  query: string;
  tokenStart: number;
  tokenLen: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeHashMatch(value: string, caret: number): Match {
  if (caret <= 0) return { open: false, query: '', tokenStart: 0, tokenLen: 0 };

  const before = value.slice(0, caret);
  const hashIndex = before.lastIndexOf('#');
  if (hashIndex < 0) return { open: false, query: '', tokenStart: 0, tokenLen: 0 };

  const charBefore = hashIndex > 0 ? before[hashIndex - 1] : '';
  const validBoundary =
    hashIndex === 0 || /\s/.test(charBefore) || charBefore === '(' || charBefore === '[';
  if (!validBoundary) return { open: false, query: '', tokenStart: 0, tokenLen: 0 };

  const token = before.slice(hashIndex);
  if (token.includes('\n')) return { open: false, query: '', tokenStart: 0, tokenLen: 0 };
  if (/\s/.test(token)) return { open: false, query: '', tokenStart: 0, tokenLen: 0 };

  const query = token.slice(1);

  return {
    open: true,
    query,
    tokenStart: hashIndex,
    tokenLen: token.length,
  };
}

export default function TagAutocompleteTextarea(props: TagAutocompleteTextareaProps) {
  const { className, value, onChangeValue, placeholder, rows = 3 } = props;

  const { items } = useTags();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [match, setMatch] = useState<Match>({ open: false, query: '', tokenStart: 0, tokenLen: 0 });
  const [activeIndex, setActiveIndex] = useState(0);

  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const filtered = useMemo(() => {
    const q = match.query.trim().toLowerCase();
    if (!match.open) return [];

    if (!q) return items;

    const starts: typeof items = [];
    const contains: typeof items = [];

    for (const it of items) {
      const t = it.label.toLowerCase();
      const hitStarts = t.startsWith(q);
      const hitContains = !hitStarts && t.includes(q);

      if (hitStarts) starts.push(it);
      else if (hitContains) contains.push(it);
    }

    return [...starts, ...contains];
  }, [items, match.open, match.query]);

  function close() {
    setMatch({ open: false, query: '', tokenStart: 0, tokenLen: 0 });
    setActiveIndex(0);
    setAnchorRect(null);
  }

  function updateAnchorRect() {
    const el = textareaRef.current;
    if (!el) return;
    setAnchorRect(el.getBoundingClientRect());
  }

  function updateMatchFromCaret() {
    const el = textareaRef.current;
    if (!el) return;

    const caret = el.selectionStart ?? 0;
    const next = computeHashMatch(value, caret);

    if (!next.open) {
      if (match.open) close();
      return;
    }

    setMatch(next);
    updateAnchorRect();

    setActiveIndex((prev) => {
      const max = Math.max(0, filtered.length - 1);
      return clamp(prev, 0, max);
    });
  }

  function replaceTokenWithTag(tagId: string) {
    const el = textareaRef.current;
    if (!el) return;

    const caret = el.selectionStart ?? 0;
    const next = computeHashMatch(value, caret);
    if (!next.open) return;

    const before = value.slice(0, next.tokenStart);
    const after = value.slice(next.tokenStart + next.tokenLen);

    const insert = `#{${tagId}} `;
    const nextValue = `${before}${insert}${after}`;

    onChangeValue(nextValue);

    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });

    close();
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!match.open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const insideTextarea = textareaRef.current?.contains(t) ?? false;
      const insidePopover = popoverRef.current?.contains(t) ?? false;

      if (!insideTextarea && !insidePopover) close();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [match.open]);

  useEffect(() => {
    function onWinResize() {
      if (!match.open) return;
      updateAnchorRect();
    }

    window.addEventListener('resize', onWinResize);
    window.addEventListener('scroll', onWinResize, true);

    return () => {
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('scroll', onWinResize, true);
    };
  }, [match.open]);

  const popover = (() => {
    if (!match.open || !anchorRect) return null;

    const margin = 8;
    const width = Math.max(260, Math.round(anchorRect.width));
    const left = clamp(Math.round(anchorRect.left), margin, window.innerWidth - width - margin);

    const desiredTop = Math.round(anchorRect.bottom + 10);
    const maxH = 360;

    const spaceBelow = window.innerHeight - desiredTop - margin;
    const finalMaxH = Math.max(160, Math.min(maxH, spaceBelow));

    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      top: desiredTop,
      width,
      maxHeight: finalMaxH,
    };

    return createPortal(
      <div
        ref={popoverRef}
        className='slash-manager__tag-popover'
        style={style}
        role='listbox'
        aria-label='Tags'
      >
        {filtered.length === 0 ? (
          <div className='slash-manager__tag-empty'>Nenhuma tag</div>
        ) : (
          <div className='slash-manager__tag-list'>
            {filtered.map((it, idx) => (
              <button
                key={it.id}
                type='button'
                className={`slash-manager__tag-item ${idx === activeIndex ? 'is-active' : ''}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  replaceTokenWithTag(it.id);
                }}
                title='Inserir tag'
              >
                <span className='slash-manager__tag-hash'>#</span>
                <span className='slash-manager__tag-label'>{it.label}</span>
                <span className='slash-manager__tag-id'>{it.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>,
      document.body,
    );
  })();

  return (
    <>
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={(e) => {
          onChangeValue(e.currentTarget.value);
        }}
        onKeyUp={() => {
          updateMatchFromCaret();
        }}
        onClick={() => {
          updateMatchFromCaret();
        }}
        onFocus={() => {
          updateMatchFromCaret();
        }}
        onKeyDown={(e) => {
          if (!match.open) return;

          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
            return;
          }

          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setActiveIndex((i) => Math.max(i - 1, 0));
            return;
          }

          if (e.key === 'Enter') {
            const picked = filtered[activeIndex];
            if (!picked) return;

            e.preventDefault();
            e.stopPropagation();
            replaceTokenWithTag(picked.id);
          }
        }}
        placeholder={placeholder}
        rows={rows}
      />

      {popover}
    </>
  );
}
