import { useCallback, useState } from 'react';
import type { CaseRecord } from '@/types/json-default';
import { ButtonText } from '@/app/components/button-text/ButtonText';
import './RecordCard.scss';

type RecordCardProps = {
  record: CaseRecord;
  onChange?: (updated: CaseRecord) => void;
  onDelete?: () => void;
};

export function RecordCard({ record, onChange, onDelete }: RecordCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const update = useCallback(
    (patch: Partial<CaseRecord>) => {
      onChange?.({ ...record, ...patch });
    },
    [record, onChange]
  );

  const handleTarget = (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ target: e.target.value });

  function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  const handleDetails = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    autoResize(e.target);
    update({ details: e.target.value });
  };

  return (
    <article className='record-card'>
      <div className='record-card__header'>
        <h2 className='record-card__label'>#</h2>
        <input
          className='record-card__target'
          value={record.target}
          onChange={handleTarget}
          placeholder='Ex: CPF, Telefone, PIX...'
        />
        <ButtonText
          text={collapsed ? '▼' : '▲'}
          size='sm'
          variant='outline'
          onClick={() => setCollapsed((prev) => !prev)}
        />
        <ButtonText
          text='🗑️'
          size='sm'
          variant='outline'
          onClick={() => {
            if (confirm('Deseja excluir?')) {
              onDelete?.();
            }
          }}
        />
      </div>
      {!collapsed && (
        <div className='record-card__section'>
          <textarea
            className='record-card__details'
            value={record.details}
            onChange={handleDetails}
            placeholder='[✔️] # OFÍCIO: Nome;'
            rows={1}
          />
        </div>
      )}
    </article>
  );
}
