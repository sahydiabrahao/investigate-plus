import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export type ActiveLinkData = {
  refId: string;
  index?: number;
  rect: DOMRect;
};

export type LinkPluginProps = {
  onActiveLinkChange?: (data: ActiveLinkData | null) => void;
};

export function LinkPlugin({ onActiveLinkChange }: LinkPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      const rootEl = editor.getRootElement();
      if (!rootEl) {
        onActiveLinkChange?.(null);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        onActiveLinkChange?.(null);
        return;
      }

      const range = selection.getRangeAt(0);

      if (!rootEl.contains(range.endContainer)) {
        onActiveLinkChange?.(null);
        return;
      }

      const text = rootEl.textContent ?? '';
      const cursorPos = getCursorOffset(rootEl, range);

      // ✅ base36 com 4 chars: [🔗:39w4]
      // ✅ legado: [🔗]
      const regex = /\[🔗(?::([a-z0-9]{4}))?\]/gi;

      let match: RegExpExecArray | null;
      let idx = 0;

      while ((match = regex.exec(text))) {
        const start = match.index;
        const end = start + match[0].length;

        if (cursorPos >= start && cursorPos < end) {
          const refId = match[1];
          const rect = range.cloneRange().getBoundingClientRect();

          if (!refId) {
            onActiveLinkChange?.({
              refId: `legacy:${idx}`,
              index: idx,
              rect,
            });
            return;
          }

          onActiveLinkChange?.({ refId, index: idx, rect });
          return;
        }

        idx++;
      }

      onActiveLinkChange?.(null);
    });
  }, [editor, onActiveLinkChange]);

  return null;
}

function getCursorOffset(rootEl: HTMLElement, range: Range): number {
  const preCaret = range.cloneRange();
  preCaret.selectNodeContents(rootEl);
  preCaret.setEnd(range.endContainer, range.endOffset);
  return preCaret.toString().length;
}
