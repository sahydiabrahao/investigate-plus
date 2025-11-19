import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export type ActiveLinkData = {
  index: number;
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

      const regex = /\[🔗\]/g;
      let match: RegExpExecArray | null;
      let idx = 0;
      let foundIndex: number | null = null;

      while ((match = regex.exec(text))) {
        const start = match.index;
        const end = start + match[0].length;

        if (cursorPos >= start && cursorPos <= end) {
          foundIndex = idx;
          break;
        }

        idx++;
      }

      if (foundIndex === null) {
        onActiveLinkChange?.(null);
        return;
      }

      const rect = range.getBoundingClientRect();

      onActiveLinkChange?.({ index: foundIndex, rect });
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
