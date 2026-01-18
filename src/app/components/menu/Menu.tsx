import './Menu.scss';
import { TreePanel } from '@/app/components/tree-panel/TreePanel';
import { useTreeState } from '@/hooks';
import type { DirNode } from '@/utils/read-directory-tree';
import { useCaseContext } from '@/context/CaseContext';

export function Menu() {
  const { dirTree, selectCase, setCurrentDirPath, setViewMode } = useCaseContext();

  const { expanded, handleToggle, handleDirClick } = useTreeState(dirTree);

  async function handleFileClick(handle: FileSystemFileHandle, parentDirPath: string | null) {
    const file = await handle.getFile();
    const name = file.name.toLowerCase();

    if (name.endsWith('.json')) {
      selectCase(handle, parentDirPath);
      setViewMode('dashboard');
      return;
    }

    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handleDirClickWithContext(node: DirNode) {
    setCurrentDirPath(node.path);
    handleDirClick(node);
  }

  return (
    <div className='menu'>
      <div className='menu__list'>
        {!dirTree && <div className='menu__item menu__item--empty'>Nenhuma pasta importada</div>}

        {dirTree && (
          <TreePanel
            dirTree={dirTree}
            expanded={expanded}
            onToggle={handleToggle}
            onFileClick={handleFileClick}
            onDirClick={handleDirClickWithContext}
          />
        )}
      </div>
    </div>
  );
}
