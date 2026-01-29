import { Outlet } from 'react-router-dom';
import { Menu } from '@/app/components/menu/Menu';
import { BottomMenu } from '@/app/components/bottom-menu/BottomMenu';
import './AppLayout.scss';

export function AppLayout() {
  return (
    <div className='app-layout'>
      <aside className='app-layout__sidebar'>
        <div className='app-layout__sidebar-content'>
          <Menu />
        </div>

        <footer className='app-layout__sidebar-bottom'>
          <BottomMenu />
        </footer>
      </aside>

      <main className='app-layout__content'>
        <Outlet />
      </main>
    </div>
  );
}
