import './NotesRichEditor.scss';

import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { DirNode, FileNode } from '@/utils/read-directory-tree';

import { toRelativePathFromRoot } from '@/utils/open-file';
import { $createFileLinkNode } from '@/app/components/file-link-node/FileLinkNode';

import { useEffect, useMemo, useRef, useState } from 'react';
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

import { FileLinkNode } from '@/app/components/file-link-node/FileLinkNode';

type NotesRichEditorProps = {
  initialState?: unknown;
  onChange?: (state: unknown) => void;
};

type PatchStyleValue =
  | string
  | null
  | ((currentStyleValue: string | null, target: ElementNode | RangeSelection | TextNode) => string);

type PatchStyleMap = Record<string, PatchStyleValue>;

type FsNode = DirNode | FileNode;

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

    nodes: [FileLinkNode],

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

function findDirNodeByPath(tree: DirNode, targetPath: string): DirNode | null {
  if (tree.path === targetPath) return tree;

  for (const child of tree.children as FsNode[]) {
    if (child.path === targetPath) {
      return child.type === 'directory' ? (child as DirNode) : null;
    }

    if (child.type === 'directory') {
      const found = findDirNodeByPath(child as DirNode, targetPath);
      if (found) return found;
    }
  }

  return null;
}

function listFilesUnderCase(
  caseNode: DirNode,
): Array<{ displayName: string; relativePath: string }> {
  const out: Array<{ displayName: string; relativePath: string }> = [];

  function walk(node: DirNode, basePath: string) {
    for (const child of node.children) {
      if (child.type === 'file') {
        if (child.name === 'investigacao.json') continue;

        const rel = basePath ? `${basePath}/${child.name}` : child.name;
        out.push({ displayName: child.name, relativePath: rel });
      } else {
        const nextBase = basePath ? `${basePath}/${child.name}` : child.name;
        walk(child, nextBase);
      }
    }
  }

  walk(caseNode, '');
  return out;
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const { dirTree, selectedCasePath, rootHandle } = useWorkspace();

  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);

  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  const symbolsPopoverRef = useRef<HTMLDivElement | null>(null);
  const attachPopoverRef = useRef<HTMLDivElement | null>(null);

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

  const attachFiles = useMemo(() => {
    if (!dirTree) return [];
    if (!selectedCasePath) return [];

    const caseNode = findDirNodeByPath(dirTree as DirNode, selectedCasePath);
    if (!caseNode) return [];

    return listFilesUnderCase(caseNode);
  }, [dirTree, selectedCasePath]);

  function insertFileLink(relativePath: string, displayName: string) {
    if (!rootHandle) return;
    if (!selectedCasePath) return;

    const caseRel = toRelativePathFromRoot(rootHandle.name, selectedCasePath);

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      selection.insertNodes([
        $createFileLinkNode({
          casePath: caseRel,
          relativePath,
          displayName,
        }),
      ]);

      selection.insertText(' ');
    });

    setIsAttachOpen(false);
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inColor = colorPopoverRef.current?.contains(t) ?? false;
      const inSymbols = symbolsPopoverRef.current?.contains(t) ?? false;
      const inAttach = attachPopoverRef.current?.contains(t) ?? false;

      if (!inColor) setIsColorOpen(false);
      if (!inSymbols) setIsSymbolsOpen(false);
      if (!inAttach) setIsAttachOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const canAttach = Boolean(rootHandle && dirTree && selectedCasePath);

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

      <div className='notes-editor__popover-wrap' ref={attachPopoverRef}>
        <button
          type='button'
          onClick={() => {
            if (!canAttach) return;
            setIsAttachOpen((v) => !v);
          }}
          aria-haspopup='menu'
          aria-expanded={isAttachOpen}
          title={canAttach ? 'Anexar arquivo do caso' : 'Selecione um caso para anexar'}
          disabled={!canAttach}
        >
          🔗
        </button>

        {isAttachOpen && (
          <div
            className='notes-editor__popover notes-editor__popover--attachments'
            role='menu'
            aria-label='Arquivos do caso'
          >
            {attachFiles.length === 0 ? (
              <div className='notes-editor__empty-popover'>Nenhum arquivo encontrado no caso.</div>
            ) : (
              attachFiles.map((f) => (
                <button
                  key={f.relativePath}
                  type='button'
                  className='notes-editor__symbol'
                  onClick={() => insertFileLink(f.relativePath, f.displayName)}
                  title={f.relativePath}
                >
                  {f.displayName}
                </button>
              ))
            )}
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
