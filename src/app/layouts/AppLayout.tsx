import { Menu } from '@/app/components/menu/Menu';
import { Sidebar } from '@/app/components/sidebar/Sidebar';
import Dashboard from '@/app/pages/dashboard/Dashboard';
import Overview from '@/app/pages/overview/OverView';
import { useCaseContext } from '@/context/CaseContext';
import './AppLayout.scss';

export function AppLayout() {
  const { viewMode } = useCaseContext();

  return (
    <div className='app-layout'>
      <aside className='app-layout__sidebar'>
        <Sidebar />
      </aside>

      <aside className='app-layout__menu'>
        <Menu />
      </aside>

      <main className='app-layout__content'>
        {viewMode === 'overview' ? <Overview /> : <Dashboard />}
      </main>
    </div>
  );
}
