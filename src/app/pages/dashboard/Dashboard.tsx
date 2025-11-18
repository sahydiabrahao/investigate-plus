import { useEffect, useRef, useState } from 'react';
import { useReadJsonFile, useWriteJsonFile } from '@/hooks';
import {
  CaseJson,
  CaseMetadata,
  CaseRecord,
  CaseStatus,
  createEmptyRecord,
} from '@/types/json-default';
import {
  DashboardMessage,
  ButtonStatus,
  ButtonText,
  ButtonCopy,
  RecordCard,
} from '@/app/components';
import './Dashboard.scss';
import { findFileInTree } from '@/utils/find-file-in-tree';
import { useCaseContext } from '@/context/CaseContext';

export default function Dashboard() {
  const { selectedCaseHandle, dirTree, setStatus } = useCaseContext();

  const { data, loading, error } = useReadJsonFile({
    handle: selectedCaseHandle,
  });

  const { save, saving } = useWriteJsonFile({
    handle: selectedCaseHandle,
  });

  const [editableCase, setEditableCase] = useState<CaseJson | null>(null);
  const [originalCase, setOriginalCase] = useState<CaseJson | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

  const hasChanges =
    editableCase && originalCase
      ? JSON.stringify(editableCase) !== JSON.stringify(originalCase)
      : false;

  useEffect(() => {
    if (data) {
      setEditableCase(data);
      setOriginalCase(data);

      if (selectedCaseHandle) {
        const fileKey = selectedCaseHandle.name;
        setStatus(fileKey, data.case.status);
      }
    } else {
      setEditableCase(null);
      setOriginalCase(null);
    }
  }, [data, selectedCaseHandle, setStatus]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedCaseHandle) {
    return (
      <DashboardMessage className='dashboard__empty'>
        Selecione um arquivo (.json).
      </DashboardMessage>
    );
  }

  if (loading || !editableCase) {
    return <DashboardMessage>Carregando...</DashboardMessage>;
  }

  if (error) {
    return <DashboardMessage className='dashboard__error'>{error}</DashboardMessage>;
  }

  const handleRecordChange = (id: string, updated: CaseRecord) => {
    setEditableCase((prev) =>
      prev
        ? {
            ...prev,
            records: prev.records.map((record) => (record.id === id ? updated : record)),
          }
        : prev
    );
  };

  const handleAddRecord = () => {
    setEditableCase((prev) =>
      prev
        ? {
            ...prev,
            records: [...prev.records, createEmptyRecord()],
          }
        : prev
    );
  };

  const handleDeleteRecord = (id: string) => {
    setEditableCase((prev) =>
      prev
        ? {
            ...prev,
            records: prev.records.filter((r) => r.id !== id),
          }
        : prev
    );
  };

  const handleMetadataChange = (key: keyof CaseMetadata, value: string) => {
    setEditableCase((prev) =>
      prev
        ? {
            ...prev,
            case: {
              ...prev.case,
              [key]: value,
            },
          }
        : prev
    );
  };

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }

  const handleMoveRecord = (fromIndex: number, toIndex: number) => {
    setEditableCase((prev) => {
      if (!prev) return prev;

      const records = [...prev.records];
      if (toIndex < 0 || toIndex >= records.length) return prev;

      const [moved] = records.splice(fromIndex, 1);
      records.splice(toIndex, 0, moved);

      return { ...prev, records };
    });
  };

  async function handleOpenReference(fileName: string) {
    if (!dirTree) {
      alert('Nenhuma pasta carregada.');
      return;
    }

    const handle = findFileInTree(dirTree, fileName);
    if (!handle) {
      alert(`Arquivo não encontrado: ${fileName}`);
      return;
    }

    try {
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);

      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      alert('Erro ao abrir arquivo.');
      console.error(err);
    }
  }

  const handleStatusChange = async (newStatus: CaseStatus) => {
    setStatusOpen(false);
    if (!editableCase) return;

    const updatedCase: CaseJson = {
      ...editableCase,
      case: {
        ...editableCase.case,
        status: newStatus,
      },
    };

    setEditableCase(updatedCase);
    setOriginalCase(updatedCase);

    if (selectedCaseHandle) {
      const fileKey = selectedCaseHandle.name;
      setStatus(fileKey, newStatus);
    }

    await save(updatedCase);
  };

  return (
    <div className='dashboard'>
      <header className='dashboard__header'>
        <div className='dashboard__header-row'>
          <div className='dashboard__header-title-group'>
            <div className='dashboard__status-wrapper' ref={statusRef}>
              <ButtonStatus
                status={editableCase.case.status}
                size='lg'
                onClick={() => setStatusOpen((open) => !open)}
              />

              {statusOpen && (
                <div className='dashboard__status-dropdown'>
                  <button
                    className='dashboard__status-item'
                    onClick={() => handleStatusChange('null')}
                  >
                    <ButtonStatus status='null' size='md' />
                    Sem status
                  </button>

                  <button
                    className='dashboard__status-item'
                    onClick={() => handleStatusChange('waiting')}
                  >
                    <ButtonStatus status='waiting' size='md' />
                    Aguardando
                  </button>

                  <button
                    className='dashboard__status-item'
                    onClick={() => handleStatusChange('urgent')}
                  >
                    <ButtonStatus status='urgent' size='md' />
                    Urgente
                  </button>
                  <button
                    className='dashboard__status-item'
                    onClick={() => handleStatusChange('review')}
                  >
                    <ButtonStatus status='review' size='md' />
                    Analisar
                  </button>
                  <button
                    className='dashboard__status-item'
                    onClick={() => handleStatusChange('completed')}
                  >
                    <ButtonStatus status='completed' size='md' />
                    Concluído
                  </button>
                </div>
              )}
            </div>

            <h1 className='dashboard__title'>{editableCase.case.id}</h1>
          </div>

          <div className='dashboard__header-actions'>
            <ButtonText text='Adicionar' variant='filled' size='sm' onClick={handleAddRecord} />
            <ButtonText
              text={saving ? 'Salvando...' : 'Salvar'}
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
            <h2 className='meta-field__label'>Data:</h2>
            <input
              className='meta-field__input'
              value={editableCase.case.date}
              onChange={(e) => handleMetadataChange('date', e.target.value)}
              placeholder='XX/XX/XXXX'
              size={Math.max((editableCase.case.date.length || 1) + 1, 8)}
            />

            <label className='meta-field'>
              <h2 className='meta-field__label'>Crime:</h2>
              <input
                className='meta-field__input'
                value={editableCase.case.crime}
                onChange={(e) => handleMetadataChange('crime', e.target.value)}
                size={Math.max((editableCase.case.crime.length || 1) + 1, 8)}
              />
            </label>

            <label className='meta-field'>
              <h2 className='meta-field__label'>Vítima:</h2>
              <input
                className='meta-field__input'
                value={editableCase.case.victim}
                onChange={(e) => handleMetadataChange('victim', e.target.value)}
                size={Math.max((editableCase.case.victim.length || 1) + 1, 8)}
              />
            </label>
          </label>
        </div>

        <label className='meta-field'>
          <h2 className='meta-field__label'>Resumo:</h2>
          <textarea
            className='meta-field__text-area'
            value={editableCase.case.resume}
            onChange={(e) => {
              handleMetadataChange('resume', e.target.value);
              autoResize(e.target);
            }}
            rows={1}
          />
        </label>
      </header>

      <section className='dashboard__section'>
        <div className='dashboard__section-header'>
          <h2 className='dashboard__section-title'>Investigação</h2>
          <div className='dashboard__section-actions'>
            <ButtonCopy />
          </div>
        </div>

        <div className='dashboard__records'>
          {editableCase.records.map((record, index) => (
            <RecordCard
              key={record.id}
              record={record}
              onChange={(updated) => handleRecordChange(record.id, updated)}
              onDelete={() => handleDeleteRecord(record.id)}
              onMoveUp={index === 0 ? undefined : () => handleMoveRecord(index, index - 1)}
              onMoveDown={
                index === editableCase.records.length - 1
                  ? undefined
                  : () => handleMoveRecord(index, index + 1)
              }
              isFirst={index === 0}
              isLast={index === editableCase.records.length - 1}
              onOpenReference={handleOpenReference}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
