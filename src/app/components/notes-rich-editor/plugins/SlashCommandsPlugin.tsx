import './SlashCommandsPlugin.scss';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import type { RangeSelection } from 'lexical';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from 'lexical';

import { useSlashCommands } from '@/app/hooks/useSlashCommands';
import { normalizeTrigger } from '@/types/slash-commands.types';

type Match = {
  open: boolean;
  query: string;
  tokenLen: number;
  rect: DOMRect | null;
};

function isCollapsedRange(sel: RangeSelection) {
  return sel.anchor.key === sel.focus.key && sel.anchor.offset === sel.focus.offset;
}

function computeSlashMatchFromNativeSelection(): Omit<Match, 'rect'> {
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

  if (!before.includes('/')) return { open: false, query: '', tokenLen: 0 };
  if (/\s$/.test(before)) return { open: false, query: '', tokenLen: 0 };

  const slashIndex = before.lastIndexOf('/');
  const charBefore = slashIndex > 0 ? before[slashIndex - 1] : '';

  const validBoundary = slashIndex === 0 || /\s/.test(charBefore);
  if (!validBoundary) return { open: false, query: '', tokenLen: 0 };

  const token = before.slice(slashIndex);
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

/**
 * Suporte simples a **bold**:
 * - Divide por "**"
 * - Índices ímpares viram bold
 * Obs: se tiver "**" ímpar (sem fechar), o trecho final fica normal.
 */
function insertTemplateWithBold(selection: RangeSelection, template: string) {
  const parts = template.split('**');
  const nodes: Array<ReturnType<typeof $createTextNode>> = [];

  for (let i = 0; i < parts.length; i++) {
    const text = parts[i];
    if (!text) continue;

    const node = $createTextNode(text);

    const isBold = i % 2 === 1;
    if (isBold) {
      // Lexical usa bitmask; 1 = bold
      node.setFormat(1);
    }

    nodes.push(node);
  }

  if (nodes.length === 0) return;
  selection.insertNodes(nodes);
}

export default function SlashCommandsPlugin() {
  const [editor] = useLexicalComposerContext();
  const { items } = useSlashCommands();

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

    const list = items
      .filter((x) => x.trigger.startsWith('/'))
      .map((x) => ({ ...x, triggerNorm: normalizeTrigger(x.trigger) }));

    if (!q) return list;

    const starts: typeof list = [];
    const contains: typeof list = [];

    for (const it of list) {
      const t = it.triggerNorm.slice(1);
      const hitStarts = t.startsWith(q);
      const hitContains = !hitStarts && t.includes(q);

      if (hitStarts) starts.push(it);
      else if (hitContains) contains.push(it);
    }

    return [...starts, ...contains];
  }, [items, match.query]);

  function close() {
    setMatch({ open: false, query: '', tokenLen: 0, rect: null });
    setActiveIndex(0);
  }

  function applyTemplate(template: string, tokenLen: number) {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      if (!isCollapsedRange(sel)) return;

      for (let i = 0; i < tokenLen; i++) {
        sel.deleteCharacter(true);
      }

      insertTemplateWithBold(sel, template);
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

        const next = computeSlashMatchFromNativeSelection();
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

          applyTemplate(picked.template, match.tokenLen);
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
    <div className='slash-commands' ref={rootRef} style={style} role='menu' aria-label='Atalhos'>
      {filtered.length === 0 ? (
        <div className='slash-commands__empty'>Nenhum atalho</div>
      ) : (
        <div className='slash-commands__list'>
          {filtered.map((it, idx) => (
            <button
              key={it.id}
              type='button'
              className={`slash-commands__item ${idx === activeIndex ? 'is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyTemplate(it.template, match.tokenLen);
                close();
              }}
              title='Inserir'
            >
              <span className='slash-commands__trigger'>{it.triggerNorm}</span>
              <span className='slash-commands__preview'>
                {it.template.length > 60 ? `${it.template.slice(0, 60)}…` : it.template}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
