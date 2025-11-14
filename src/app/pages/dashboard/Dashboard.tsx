import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppLayoutOutletContext } from '@/app/layouts/AppLayout';
import { useReadJsonFile, useWriteJsonFile } from '@/hooks';
import { CaseJson, CaseMetadata, CaseRecord, createEmptyRecord } from '@/types/json-default';
import { RecordCard } from '@/app/components/record-card/RecordCard';
import './Dashboard.scss';
import { DashboardMessage } from '@/app/components/dashboard-massage/DashboardMessage';
import { ButtonText } from '@/app/components/button-text/ButtonText';

export default function Dashboard() {
  const { selectedCaseHandle } = useOutletContext<AppLayoutOutletContext>();
  const { data, loading, error } = useReadJsonFile({ handle: selectedCaseHandle });
  const [editableCase, setEditableCase] = useState<CaseJson | null>(null);
  const [originalCase, setOriginalCase] = useState<CaseJson | null>(null);
  const { save, saving } = useWriteJsonFile({ handle: selectedCaseHandle });

  const hasChanges =
    editableCase && originalCase
      ? JSON.stringify(editableCase) !== JSON.stringify(originalCase)
      : false;

  useEffect(() => {
    if (data) {
      setEditableCase(data);
      setOriginalCase(data);
    } else {
      setEditableCase(null);
      setOriginalCase(null);
    }
  }, [data]);

  if (!selectedCaseHandle)
    return (
      <DashboardMessage className='dashboard__empty'>
        Selecione um arquivo (.json).
      </DashboardMessage>
    );

  if (loading || !editableCase) return <DashboardMessage>Carregando...</DashboardMessage>;

  if (error) return <DashboardMessage className='dashboard__error'>{error}</DashboardMessage>;

  const handleRecordChange = (id: string, updated: CaseRecord) => {
    setEditableCase((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        records: prev.records.map((record) => (record.id === id ? updated : record)),
      };
    });
  };

  const handleAddRecord = () => {
    setEditableCase((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        records: [...prev.records, createEmptyRecord()],
      };
    });
  };

  const handleDeleteRecord = (id: string) => {
    setEditableCase((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        records: prev.records.filter((r) => r.id !== id),
      };
    });
  };

  const handleMetadataChange = (key: keyof CaseMetadata, value: string) => {
    setEditableCase((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        case: {
          ...prev.case,
          [key]: value,
        },
      };
    });
  };

  return (
    <div className='dashboard'>
      <header className='dashboard__header'>
        <div className='dashboard__header-row'>
          <h1 className='dashboard__title'>{editableCase.case.id}</h1>
          <div className='dashboard__header-actions'>
            <ButtonText text='Novo Registro' variant='filled' size='sm' onClick={handleAddRecord} />
            <ButtonText
              text={saving ? 'Salvando...' : 'Salvar Alterações'}
              size='sm'
              variant='outline'
              disabled={saving || !editableCase || !hasChanges}
              onClick={() => {
                if (!editableCase) return;
                save(editableCase);
                setOriginalCase(editableCase);
              }}
            />
          </div>
        </div>
        <div className='dashboard__meta'>
          <label className='meta-field'>
            <span className='meta-field__label'>Crime:</span>
            <input
              className='meta-field__input'
              value={editableCase.case.crime}
              onChange={(e) => handleMetadataChange('crime', e.target.value)}
              size={Math.max((editableCase.case.crime.length || 1) + 1, 8)}
            />
          </label>
          <label className='meta-field'>
            <span className='meta-field__label'>Data:</span>
            <input
              className='meta-field__input'
              value={editableCase.case.date}
              onChange={(e) => handleMetadataChange('date', e.target.value)}
              placeholder='XX/XX/XXXX'
              size={Math.max((editableCase.case.date.length || 1) + 1, 8)}
            />
            <label className='meta-field'>
              <span className='meta-field__label'>Vítima:</span>
              <input
                className='meta-field__input'
                value={editableCase.case.victim}
                onChange={(e) => handleMetadataChange('victim', e.target.value)}
                size={Math.max((editableCase.case.victim.length || 1) + 1, 8)}
              />
            </label>
          </label>
        </div>
      </header>
      <section className='dashboard__section'>
        <h2 className='dashboard__section-title'>Investigação</h2>
        {editableCase.records.length === 0 && (
          <p className='dashboard__muted'>Nenhuma informação disponível.</p>
        )}
        <div className='dashboard__records'>
          {editableCase.records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onChange={(updated) => handleRecordChange(record.id, updated)}
              onDelete={() => handleDeleteRecord(record.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
