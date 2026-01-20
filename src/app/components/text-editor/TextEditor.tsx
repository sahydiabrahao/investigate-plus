import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TabIndentPlugin } from './plugins/TabIndentPlugin';
import { $getRoot, $createParagraphNode, $createTextNode, LexicalEditor } from 'lexical';
import { LinkPlugin, ActiveLinkData, TextEditorToolbar } from '@/app/components';
import { THEME } from './theme';
import './TextEditor.scss';

type Props = {
  plainValue: string;
  richValue?: string | null;
  onChange: (plainText: string, richText: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  onActiveLinkChange?: (data: ActiveLinkData | null) => void;
};

export function TextEditor({
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
    theme: THEME,
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

      if (plainValue && plainValue.trim() !== '') {
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode(plainValue);

        paragraph.append(textNode);
        root.append(paragraph);
      }
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className='text-editor'>
        {showToolbar && <TextEditorToolbar />}
        <LinkPlugin onActiveLinkChange={onActiveLinkChange} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable className={`text-editor__content ${className ?? ''}`} />
          }
          placeholder={<span className='text-editor__placeholder'>{placeholder}</span>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <TabIndentPlugin />
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
