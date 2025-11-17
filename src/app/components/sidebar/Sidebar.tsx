import { ButtonIcon } from '@/app/components/button-icon/ButtonIcon';
import { ImportIcon, FileJsonIcon, RefreshIcon, ListIcon } from '@/icons';
import { useCaseContext } from '@/context/CaseContext';
import { useCreateJsonFile } from '@/hooks';
import { scanDirectoryTree } from '@/utils/read-directory-tree';
import './Sidebar.scss';

export function Sidebar() {
  const { dirTree, setDirTree, rootHandle, importFolder, currentDirPath, setViewMode } =
    useCaseContext();

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

  return (
    <div className='sidebar'>
      <ButtonIcon icon={ListIcon} size='lg' onClick={() => setViewMode('overview')} />

      <ButtonIcon icon={RefreshIcon} onClick={handleRefreshTree} size='lg' />
      <ButtonIcon icon={ImportIcon} onClick={importFolder} size='lg' />
      <ButtonIcon icon={FileJsonIcon} onClick={createJsonFile} size='lg' />
    </div>
  );
}
