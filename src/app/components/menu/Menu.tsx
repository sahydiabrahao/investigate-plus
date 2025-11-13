import { useState } from 'react';
import { ButtonIcon } from '@/app/components/button-icon/ButtonIcon';
import { ImportIcon, ExpandIcon, CollapseIcon } from '@/icons';
import { scanDirectoryTree, renderTreeAsLines } from '@/utils/read-directory-tree';
import './Menu.scss';

export function Menu() {
  const [lines, setLines] = useState<string[]>([]);

  async function handleImportFolder() {
    const dir = await window.showDirectoryPicker!({ mode: 'read' });
    const tree = await scanDirectoryTree(dir);
    const renderedLines = renderTreeAsLines(tree);
    setLines(renderedLines);
  }

  return (
    <div className='menu'>
      <div className='menu__actions'>
        <ButtonIcon icon={ImportIcon} onClick={handleImportFolder} size='lg' />
        <ButtonIcon icon={ExpandIcon} size='lg' />
        <ButtonIcon icon={CollapseIcon} size='lg' />
      </div>
      <div className='menu__list'>
        {lines.length === 0 && (
          <div className='menu__item menu__item--empty'>Nenhuma pasta importada</div>
        )}

        {lines.map((line, index) => (
          <div key={index} className='menu__item'>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
