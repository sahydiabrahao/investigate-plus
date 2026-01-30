import './NotesRichEditor.scss';

import { useEffect, useRef, useState } from 'react';
import type { ElementNode, RangeSelection, TextNode } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { $patchStyleText } from '@lexical/selection';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import type { EditorState, LexicalEditor } from 'lexical';
import { $createParagraphNode, $getRoot } from 'lexical';

type NotesRichEditorProps = {
  initialState?: unknown;
  onChange?: (state: unknown) => void;
};

type PatchStyleValue =
  | string
  | null
  | ((currentStyleValue: string | null, target: ElementNode | RangeSelection | TextNode) => string);

type PatchStyleMap = Record<string, PatchStyleValue>;

function copyToClipboard(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
}

export default function NotesRichEditor({ initialState, onChange }: NotesRichEditorProps) {
  const initialConfig = {
    namespace: 'InvestigatePlusNotes',
    theme: {
      paragraph: 'notes-editor__paragraph',
      text: {
        bold: 'notes-editor__bold',
        italic: 'notes-editor__italic',
        underline: 'notes-editor__underline',
      },
    },

    editorState: (editor: LexicalEditor) => {
      if (initialState) {
        try {
          const serialized = JSON.stringify(initialState);
          const parsed = editor.parseEditorState(serialized);
          editor.setEditorState(parsed);
          return;
        } catch (e) {
          console.warn('Failed to load initial Lexical state. Falling back to empty doc.', e);
        }
      }

      editor.update(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });
    },

    onError(error: Error) {
      console.error('Lexical error:', error);
    },
  };

  return (
    <div className='notes-editor'>
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />

        <RichTextPlugin
          contentEditable={<ContentEditable className='notes-editor__content' />}
          placeholder={
            <div className='notes-editor__placeholder'>Escreva as anotações da investigação…</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <HistoryPlugin />

        <OnChangePlugin
          onChange={(editorState: EditorState) => {
            if (!onChange) return;
            onChange(editorState.toJSON());
          }}
        />
      </LexicalComposer>
    </div>
  );
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);

  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  const symbolsPopoverRef = useRef<HTMLDivElement | null>(null);

  const COLORS: Array<{ name: string; value: string | null }> = [
    { name: 'Padrão', value: null },
    { name: 'Preto', value: '#111827' },
    { name: 'Cinza', value: '#374151' },
    { name: 'Azul', value: '#1d4ed8' },
    { name: 'Vermelho', value: '#b91c1c' },
  ];

  const SYMBOLS: Array<{ name: string; value: string }> = [
    { name: 'OK', value: '✔️' },
    { name: 'Não', value: '❌' },
    { name: 'Hora', value: '🕚' },
    { name: 'Busca', value: '🔎' },
    { name: 'Link', value: '🔗' },
  ];

  function applyTextColor(color: string | null) {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const styles: PatchStyleMap = { color };
      $patchStyleText(selection, styles);
    });
  }

  function insertSymbol(symbol: string) {
    copyToClipboard(symbol);

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selection.insertText(symbol);
    });
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inColor = colorPopoverRef.current?.contains(t) ?? false;
      const inSymbols = symbolsPopoverRef.current?.contains(t) ?? false;

      if (!inColor) setIsColorOpen(false);
      if (!inSymbols) setIsSymbolsOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div className='notes-editor__toolbar'>
      <button
        type='button'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title='Negrito'
      >
        <strong>B</strong>
      </button>

      <button
        type='button'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title='Itálico'
      >
        <em>I</em>
      </button>

      <button
        type='button'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title='Sublinhado'
      >
        <u>U</u>
      </button>

      <span className='notes-editor__divider' />

      <div className='notes-editor__popover-wrap' ref={colorPopoverRef}>
        <button
          type='button'
          onClick={() => setIsColorOpen((v) => !v)}
          aria-haspopup='menu'
          aria-expanded={isColorOpen}
          title='Cor do texto'
        >
          A
        </button>

        {isColorOpen && (
          <div className='notes-editor__popover' role='menu' aria-label='Cores do texto'>
            {COLORS.map((c) => (
              <button
                key={c.name}
                type='button'
                className='notes-editor__swatch'
                onClick={() => {
                  applyTextColor(c.value);
                  setIsColorOpen(false);
                }}
                title={c.name}
                aria-label={c.name}
              >
                <span
                  className='notes-editor__dot'
                  style={{ background: c.value ?? 'transparent' }}
                  data-empty={c.value === null ? 'true' : 'false'}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className='notes-editor__popover-wrap' ref={symbolsPopoverRef}>
        <button
          type='button'
          onClick={() => setIsSymbolsOpen((v) => !v)}
          aria-haspopup='menu'
          aria-expanded={isSymbolsOpen}
          title='Inserir símbolos'
        >
          ⋯
        </button>

        {isSymbolsOpen && (
          <div className='notes-editor__popover' role='menu' aria-label='Símbolos'>
            {SYMBOLS.map((s) => (
              <button
                key={s.name}
                type='button'
                className='notes-editor__symbol'
                onClick={() => {
                  insertSymbol(s.value);
                  setIsSymbolsOpen(false);
                }}
                title={`${s.name} (insere e copia)`}
                aria-label={s.name}
              >
                {s.value}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className='notes-editor__divider' />

      <button
        type='button'
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title='Desfazer'
      >
        ↺
      </button>

      <button
        type='button'
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title='Refazer'
      >
        ↻
      </button>
    </div>
  );
}
