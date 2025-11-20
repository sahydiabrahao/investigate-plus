import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { useState, useRef, useEffect } from 'react';
import { $patchStyleText } from '@lexical/selection';
import './TextEditorToolbar.scss';

export function TextEditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const [showColors, setShowColors] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowColors(false);
        setShowFormats(false);
      }
    }

    if (showColors || showFormats) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColors, showFormats]);

  const applyColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  const toggleFormat = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  return (
    <div className='text-editor-toolbar' ref={toolbarRef}>
      <div className='text-editor-toolbar__dropdown text-editor-toolbar__dropdown--format'>
        <button
          type='button'
          className='text-editor-toolbar__trigger text-editor-toolbar__trigger--format'
          onClick={() => {
            setShowFormats((prev) => !prev);
            setShowColors(false);
          }}
        >
          <span>𝘼</span>
        </button>
        {showFormats && (
          <div className='text-editor-toolbar__menu text-editor-toolbar__menu--format'>
            <button type='button' onClick={() => toggleFormat('bold')}>
              <b>B</b>
            </button>
            <button type='button' onClick={() => toggleFormat('italic')}>
              <i>I</i>
            </button>
            <button type='button' onClick={() => toggleFormat('underline')}>
              U
            </button>
          </div>
        )}
      </div>

      <div className='text-editor-toolbar__dropdown'>
        <button
          className='text-editor-toolbar__trigger'
          type='button'
          onClick={() => {
            setShowColors((prev) => !prev);
            setShowFormats(false);
          }}
        >
          🎨
        </button>
        {showColors && (
          <div className='text-editor-toolbar__menu'>
            <button
              type='button'
              className='text-editor-toolbar__swatch text-editor-toolbar__swatch--yellow'
              onClick={() => applyColor('#facc15')}
            />
            <button
              type='button'
              className='text-editor-toolbar__swatch text-editor-toolbar__swatch--green'
              onClick={() => applyColor('#22c55e')}
            />
            <button
              type='button'
              className='text-editor-toolbar__swatch text-editor-toolbar__swatch--red'
              onClick={() => applyColor('#ef4444')}
            />
            <button
              type='button'
              className='text-editor-toolbar__swatch text-editor-toolbar__swatch--blue'
              onClick={() => applyColor('#3b82f6')}
            />
            <button
              type='button'
              className='text-editor-toolbar__swatch text-editor-toolbar__swatch--reset'
              onClick={() => applyColor('')}
              title='Remover cor'
            />
          </div>
        )}
      </div>
    </div>
  );
}
