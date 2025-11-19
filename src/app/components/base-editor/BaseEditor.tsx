import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $patchStyleText } from '@lexical/selection';
import { $getRoot, $createParagraphNode, $createTextNode, LexicalEditor } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import { LinkPlugin, ActiveLinkData } from '@/app/components';
import { lexicalTheme } from './style/theme';
import './style/theme.scss';

type Props = {
  plainValue: string;
  richValue?: string | null;
  onChange: (plainText: string, richText: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  onActiveLinkChange?: (data: ActiveLinkData | null) => void;
};

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const applyColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  return (
    <div className='lexical-toolbar-vertical'>
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
        <b>B</b>
      </button>
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
        <i>I</i>
      </button>
      <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}>U</button>
      <button className='color-swatch color-yellow' onClick={() => applyColor('#facc15')} />
      <button className='color-swatch color-green' onClick={() => applyColor('#22c55e')} />
      <button className='color-swatch color-red' onClick={() => applyColor('#ef4444')} />
      <button className='color-swatch color-blue' onClick={() => applyColor('#3b82f6')} />
      <button className='color-swatch color-none' onClick={() => applyColor('')} />
    </div>
  );
}
export function BaseEditor({
  plainValue,
  richValue,
  onChange,
  placeholder,
  className,
  showToolbar,
  onActiveLinkChange,
}: Props) {
  const initialConfig = {
    namespace: 'record-editor',
    theme: lexicalTheme,
    onError(error: unknown) {
      console.error(error);
    },
    editorState(editor: LexicalEditor) {
      if (richValue) {
        const parsed = editor.parseEditorState(richValue);
        editor.setEditorState(parsed);
        return;
      }

      const root = $getRoot();
      root.clear();

      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(plainValue ?? ''));
      root.append(paragraph);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className='lexical-details-wrapper'>
        {showToolbar && <ToolbarPlugin />}
        <LinkPlugin onActiveLinkChange={onActiveLinkChange} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable className={`lexical-content-editable ${className ?? ''}`} />
          }
          placeholder={<span className='placeholder'>{placeholder}</span>}
          ErrorBoundary={LexicalErrorBoundary}
        />

        <HistoryPlugin />

        <OnChangePlugin
          onChange={(editorState) => {
            const richJson = JSON.stringify(editorState);

            editorState.read(() => {
              const plain = $getRoot().getTextContent();
              onChange(plain, richJson);
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
}
