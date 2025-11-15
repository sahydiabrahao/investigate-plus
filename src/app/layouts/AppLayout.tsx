import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useReadDirectoryHandle } from '@/hooks';
import type { DirNode } from '@/utils/read-directory-tree';
import { Menu } from '@/app/components/menu/Menu';
import './AppLayout.scss';

export type AppLayoutOutletContext = {
  selectedCaseHandle: FileSystemFileHandle | null;
  dirTree: DirNode | null;
};

export function AppLayout() {
  const [selectedCaseHandle, setSelectedCaseHandle] = useState<FileSystemFileHandle | null>(null);
  const { dirTree, setDirTree, rootHandle, importFolder } = useReadDirectoryHandle();

  return (
    <div className='app-layout'>
      <aside className='app-layout__sidebar'>
        <Menu
          dirTree={dirTree}
          setDirTree={setDirTree}
          rootHandle={rootHandle}
          importFolder={importFolder}
          onCaseJsonSelected={setSelectedCaseHandle}
        />
      </aside>
      <main className='app-layout__content'>
        <Outlet context={{ selectedCaseHandle, dirTree }} />
      </main>
    </div>
  );
}
