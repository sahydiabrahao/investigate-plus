import { useCaseContext } from '@/context/CaseContext';
import { useCaseSummary } from '@/hooks';
import { CaseCard } from '@/app/components';
import './Overview.scss';

export default function Overview() {
  const { dirTree, setSelectedCaseHandle, setViewMode } = useCaseContext();
  const { summaries, loading, error } = useCaseSummary(dirTree);

  const handleSelect = (handle: FileSystemFileHandle) => {
    setSelectedCaseHandle(handle);
    setViewMode('dashboard');
  };

  if (loading) return <div>Carregando casos...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className='overview'>
      <header className='overview__header'>
        <div>
          <h1 className='overview__title'>Casos</h1>
          <p className='overview__subtitle'>{summaries.length} casos encontrados</p>
        </div>
      </header>

      <div className='overview__grid'>
        {summaries.map((s) => (
          <CaseCard key={s.fileName} summary={s} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}
