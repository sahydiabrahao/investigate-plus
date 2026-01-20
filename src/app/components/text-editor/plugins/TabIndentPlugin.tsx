import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR } from 'lexical';
import { KEY_TAB_COMMAND } from 'lexical';
import { useEffect } from 'react';
import { $getSelection, $isRangeSelection } from 'lexical';

export function TabIndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        event.preventDefault();

        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return true;
        }

        selection.insertText('\t');

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
