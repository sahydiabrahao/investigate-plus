import './Dashboard.scss';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function Dashboard() {
  const { selectedPath } = useWorkspace();

  if (!selectedPath) {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Nenhum arquivo selecionado</h1>
        <p className='dashboard__subtitle'>
          Selecione um arquivo na barra lateral para visualizar informações.
        </p>
      </div>
    );
  }

  return (
    <div className='dashboard'>
      <h1 className='dashboard__title'>Arquivo selecionado</h1>

      <div className='dashboard__card'>
        <div className='dashboard__row'>
          <span className='dashboard__label'>Path</span>
          <span className='dashboard__value'>{selectedPath}</span>
        </div>
      </div>
    </div>
  );
}
