import './NotesRichEditor.scss';

import { useWorkspace } from '@/contexts/WorkspaceContext';

import { toRelativePathFromRoot } from '@/utils/open-file';
import { $createFileLinkNode } from '@/app/components/file-link-node/FileLinkNode';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementNode, RangeSelection, TextNode } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  COMMAND_PRIORITY_HIGH,
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
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';

import { getDirectoryHandleByRelativePath } from '@/utils/get-directory-handle';

type NotesRichEditorProps = {
  initialState?: unknown;
  onChange?: (state: unknown) => void;
};

type PatchStyleValue =
  | string
  | null
  | ((currentStyleValue: string | null, target: ElementNode | RangeSelection | TextNode) => string);

type PatchStyleMap = Record<string, PatchStyleValue>;

type CaseEntry =
  | {
      type: 'file';
      displayName: string;
      relativePath: string; // relativo ao caso
    }
  | {
      type: 'directory';
      name: string;
      relativePath: string; // relativo ao caso (pasta)
      children: CaseEntry[];
    };

function copyToClipboard(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
}

function compareNamesPtBr(a: string, b: string) {
  const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  return collator.compare(a, b);
}

function sortEntries(entries: CaseEntry[]) {
  // pastas primeiro, depois arquivos; ambos ordenados
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    if (a.type === 'directory' && b.type === 'directory') return compareNamesPtBr(a.name, b.name);
    if (a.type === 'file' && b.type === 'file')
      return compareNamesPtBr(a.displayName, b.displayName);
    return 0;
  });

  for (const e of entries) {
    if (e.type === 'directory') sortEntries(e.children);
  }
}

async function listEntriesUnderCaseHandle(
  caseHandle: FileSystemDirectoryHandle,
): Promise<CaseEntry[]> {
  async function buildTree(dir: FileSystemDirectoryHandle, basePath: string): Promise<CaseEntry[]> {
    const out: CaseEntry[] = [];

    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        if (entry.name === 'investigacao.json') continue;

        const rel = basePath ? `${basePath}/${entry.name}` : entry.name;

        out.push({
          type: 'file',
          displayName: entry.name,
          relativePath: rel,
        });
      }

      if (entry.kind === 'directory') {
        const nextBase = basePath ? `${basePath}/${entry.name}` : entry.name;

        const children = await buildTree(entry, nextBase);

        // se quiser esconder pastas vazias, descomente:
        // if (children.length === 0) continue;

        out.push({
          type: 'directory',
          name: entry.name,
          relativePath: nextBase,
          children,
        });
      }
    }

    return out;
  }

  const tree = await buildTree(caseHandle, '');
  sortEntries(tree);
  return tree;
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
        <TabIndentationPlugin />

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
  const { dirTree, selectedCasePath, rootHandle } = useWorkspace();

  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);

  const [attachEntries, setAttachEntries] = useState<CaseEntry[]>([]);
  const [isAttachLoading, setIsAttachLoading] = useState(false);

  // estado de expansão das pastas (persistente enquanto o caso não muda)
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  const symbolsPopoverRef = useRef<HTMLDivElement | null>(null);
  const attachPopoverRef = useRef<HTMLDivElement | null>(null);

  const loadTokenRef = useRef(0);

  const COLORS: Array<{ name: string; value: string | null }> = [
    { name: 'Padrão', value: null },
    { name: 'Amarelo', value: '#ca8a04' },
    { name: 'Verde', value: '#15803d' },
    { name: 'Azul', value: '#1e40af' },
    { name: 'Rosa', value: '#be185d' },
    { name: 'Vermelho', value: '#991b1b' },
  ];

  const SYMBOLS: Array<{ name: string; value: string }> = [
    { name: 'Hierarquia', value: '▸' },
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

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const isMod = event.ctrlKey || event.metaKey;

        const isPeriod =
          event.key === '.' || event.code === 'Period' || event.key === '>' || event.key === '·';

        if (!isMod || !isPeriod) return false;

        event.preventDefault();
        event.stopPropagation();

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          selection.insertText('▸ ');
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  async function ensureAttachFilesLoaded() {
    if (!rootHandle) return;
    if (!selectedCasePath) return;

    const currentToken = ++loadTokenRef.current;

    try {
      setIsAttachLoading(true);

      const relativeCasePath = toRelativePathFromRoot(rootHandle.name, selectedCasePath);
      const caseHandle = await getDirectoryHandleByRelativePath(rootHandle, relativeCasePath);

      const entries = await listEntriesUnderCaseHandle(caseHandle);

      if (loadTokenRef.current !== currentToken) return;

      setAttachEntries(entries);

      // expande automaticamente as pastas do 1º nível (opcional)
      const nextExpanded: Record<string, boolean> = {};
      for (const e of entries) {
        if (e.type === 'directory') nextExpanded[e.relativePath] = true;
      }
      setExpandedDirs(nextExpanded);
    } catch {
      if (loadTokenRef.current !== currentToken) return;
      setAttachEntries([]);
      setExpandedDirs({});
    } finally {
      if (loadTokenRef.current === currentToken) {
        setIsAttachLoading(false);
      }
    }
  }

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

  // ao trocar de caso: zera lista / loading / token e também expansão
  useEffect(() => {
    setAttachEntries([]);
    setIsAttachLoading(false);
    setExpandedDirs({});
    loadTokenRef.current++;
  }, [selectedCasePath]);

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

  const attachmentTree = useMemo(() => {
    function renderEntries(entries: CaseEntry[], level: number): React.ReactNode {
      return entries.map((entry) => {
        if (entry.type === 'file') {
          const ext = entry.displayName.split('.').pop()?.toLowerCase() ?? '';
          return (
            <button
              key={entry.relativePath}
              type='button'
              className='notes-editor__attachment-item notes-editor__attachment-file'
              style={{ paddingLeft: 8 + level * 14 }}
              onClick={() => insertFileLink(entry.relativePath, entry.displayName)}
              title={entry.relativePath}
              data-ext={ext}
            >
              <span className='notes-editor__attachment-label'>{entry.displayName}</span>
            </button>
          );
        }

        const isOpen = expandedDirs[entry.relativePath] ?? false;

        return (
          <div key={entry.relativePath} className='notes-editor__attachment-group'>
            <button
              type='button'
              className='notes-editor__attachment-item notes-editor__attachment-folder'
              style={{ paddingLeft: 8 + level * 14 }}
              onClick={() =>
                setExpandedDirs((prev) => ({
                  ...prev,
                  [entry.relativePath]: !isOpen,
                }))
              }
              title={entry.relativePath}
              aria-expanded={isOpen}
            >
              <span className='notes-editor__folder-caret' aria-hidden='true'>
                {isOpen ? '▾' : '▸'}
              </span>
              <span className='notes-editor__attachment-label'>{entry.name}</span>
            </button>

            {isOpen && (
              <div className='notes-editor__attachment-children'>
                {renderEntries(entry.children, level + 1)}
              </div>
            )}
          </div>
        );
      });
    }

    return renderEntries(attachEntries, 0);
  }, [attachEntries, expandedDirs]);

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
          onClick={async () => {
            if (!canAttach) return;

            const nextOpen = !isAttachOpen;
            setIsAttachOpen(nextOpen);

            if (nextOpen) {
              await ensureAttachFilesLoaded();
            }
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
            {isAttachLoading ? (
              <div className='notes-editor__loading'>…</div>
            ) : attachEntries.length === 0 ? (
              <div className='notes-editor__empty-popover'>Nenhum arquivo encontrado no caso.</div>
            ) : (
              <div className='notes-editor__attachments-tree'>{attachmentTree}</div>
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
