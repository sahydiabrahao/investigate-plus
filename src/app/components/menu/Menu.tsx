import './Menu.scss';
import { ButtonIcon } from '@/app/components/button-icon/ButtonIcon';
import { ImportIcon, ExpandIcon, CollapseIcon, FileJsonIcon, RefreshIcon } from '@/icons';
import { TreePanel } from '@/app/components/tree-panel/TreePanel';
import { useReadDirectoryHandle, useTreeState, useCreateJsonFile } from '@/hooks';
import { scanDirectoryTree } from '@/utils/read-directory-tree';

type MenuProps = {
  onCaseJsonSelected?: (handle: FileSystemFileHandle) => void;
};

export function Menu({ onCaseJsonSelected }: MenuProps) {
  const { dirTree, setDirTree, rootHandle, importFolder } = useReadDirectoryHandle();

  const {
    expanded,
    currentDirPath,
    handleToggle,
    handleExpandAll,
    handleCollapseAll,
    handleDirClick,
  } = useTreeState(dirTree);

  const { createJsonFile } = useCreateJsonFile({
    rootHandle,
    dirTree,
    currentDirPath,
    setDirTree,
  });

  async function handleRefreshTree() {
    if (!rootHandle) return;
    const updatedTree = await scanDirectoryTree(rootHandle);
    setDirTree(updatedTree);
  }

  async function handleFileClick(handle: FileSystemFileHandle) {
    const file = await handle.getFile();
    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) {
      onCaseJsonSelected?.(handle);
      return;
    }
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className='menu'>
      <div className='menu__actions'>
        <ButtonIcon icon={ImportIcon} onClick={importFolder} size='lg' />
        <ButtonIcon icon={FileJsonIcon} onClick={createJsonFile} size='lg' />
        <ButtonIcon icon={RefreshIcon} onClick={handleRefreshTree} size='lg' />
        <ButtonIcon icon={ExpandIcon} onClick={handleExpandAll} size='lg' />
        <ButtonIcon icon={CollapseIcon} onClick={handleCollapseAll} size='lg' />
      </div>

      <div className='menu__list'>
        {!dirTree && <div className='menu__item menu__item--empty'>Nenhuma pasta importada</div>}

        {dirTree && (
          <TreePanel
            dirTree={dirTree}
            expanded={expanded}
            onToggle={handleToggle}
            onFileClick={handleFileClick}
            onDirClick={handleDirClick}
          />
        )}
      </div>
    </div>
  );
}
