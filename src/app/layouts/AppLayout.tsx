import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from '@/app/components/menu/Menu';
import { BottomMenu } from '@/app/components/bottom-menu/BottomMenu';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import CaseListView from '@/app/components/case-list-view/CaseListView';
import './AppLayout.scss';
import { ChevronLeftIcon } from '../icons';

const SIDEBAR_MIN = 300;
const SIDEBAR_MAX = 520;

export function AppLayout() {
  const { importFolder, refreshTree, rootHandle, dirTree } = useWorkspace();

  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_MIN);
  const isDraggingRef = useRef(false);

  const [isCasesOpen, setIsCasesOpen] = useState(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;

      const next = Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX);
      setSidebarWidth(next);
    }

    function onUp() {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!dirTree) setIsCasesOpen(false);
  }, [dirTree]);

  function startDrag() {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div className='app-layout'>
      <aside className='app-layout__sidebar' style={{ width: sidebarWidth }}>
        <div className='app-layout__sidebar-content'>
          <Menu />
        </div>

        <footer className='app-layout__sidebar-bottom'>
          <BottomMenu onImport={importFolder} onRefresh={refreshTree} canRefresh={!!rootHandle} />
        </footer>

        <div className='app-layout__resizer' onMouseDown={startDrag} />
      </aside>

      <main className='app-layout__content'>
        <Outlet />
      </main>

      {!isCasesOpen && (
        <button
          type='button'
          className='app-layout__cases-fab'
          onClick={() => setIsCasesOpen(true)}
          disabled={!dirTree}
          aria-label='Ver todos os casos'
          title='Casos'
        >
          <ChevronLeftIcon size={18} />
        </button>
      )}

      <CaseListView open={isCasesOpen} onClose={() => setIsCasesOpen(false)} />
    </div>
  );
}
