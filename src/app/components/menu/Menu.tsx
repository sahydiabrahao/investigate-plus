import './Menu.scss';
import { TreePanel } from '@/app/components/tree-panel/TreePanel';
import { useTreeState } from '@/hooks';
import type { DirNode } from '@/utils/read-directory-tree';
import { useCaseContext } from '@/context/CaseContext';

export function Menu() {
  // ✅ mudou: em vez de setSelectedCaseHandle, vamos usar selectCase (novo no Context)
  const { dirTree, selectCase, setCurrentDirPath, setViewMode } = useCaseContext();

  const { expanded, handleToggle, handleDirClick } = useTreeState(dirTree);

  // ✅ mudou: agora recebemos também o caminho da pasta pai do arquivo clicado
  async function handleFileClick(handle: FileSystemFileHandle, parentDirPath: string | null) {
    const file = await handle.getFile();
    const name = file.name.toLowerCase();

    if (name.endsWith('.json')) {
      // ✅ novo: seleciona caso + registra a pasta do caso no Context
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
