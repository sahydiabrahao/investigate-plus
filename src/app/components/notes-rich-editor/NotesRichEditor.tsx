// components/notes-rich-editor/NotesRichEditor.tsx
import './NotesRichEditor.scss';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import type { EditorState, LexicalEditor } from 'lexical';
import {
  $createParagraphNode,
  $getRoot,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';

type NotesRichEditorProps = {
  initialState?: unknown; // JSON do editorState.toJSON()
  onChange?: (state: unknown) => void;
};

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

    // ✅ IMPORTANTE: aqui a gente "parseia" o JSON antes de setar
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

      // fallback: documento vazio
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

  return (
    <div className='notes-editor__toolbar'>
      <button type='button' onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
        <strong>B</strong>
      </button>

      <button type='button' onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
        <em>I</em>
      </button>

      <button
        type='button'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
      >
        <u>U</u>
      </button>

      <span className='notes-editor__divider' />

      <button type='button' onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        ↺
      </button>

      <button type='button' onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        ↻
      </button>
    </div>
  );
}
