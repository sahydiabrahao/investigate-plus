import { useCallback } from 'react';
import type { CaseRecord, RecordStatus } from '@/types/json-default';
import './RecordCard.scss';

type RecordCardProps = {
  record: CaseRecord;
  onChange?: (updated: CaseRecord) => void;
  onDelete?: () => void;
};

const STATUS_LABEL: Record<RecordStatus, string> = {
  waiting: 'Waiting',
  pending: 'Pending',
  answered: 'Answered',
};

// Utilitário interno
function copy(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(console.error);
  } else {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }
}

export function RecordCard({ record, onChange, onDelete }: RecordCardProps) {
  const update = useCallback(
    (patch: Partial<CaseRecord>) => {
      onChange?.({ ...record, ...patch });
    },
    [record, onChange]
  );

  const handleTarget = (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ target: e.target.value });

  const handleDetails = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    update({ details: e.target.value });

  const handleStatus = (status: RecordStatus) => update({ status });

  return (
    <article className='record-card'>
      {/* Cabeçalho */}
      <header className='record-card__header'>
        <input
          className='record-card__target'
          value={record.target}
          onChange={handleTarget}
          placeholder='Dado investigado (ex: CPF, Telefone, PIX...)'
        />

        <div className='record-card__status-group'>
          {(['waiting', 'pending', 'answered'] as RecordStatus[]).map((s) => (
            <button
              key={s}
              type='button'
              className={`record-card__status-pill record-card__status-pill--${s} ${
                record.status === s ? 'record-card__status-pill--active' : ''
              }`}
              onClick={() => handleStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </header>

      {/* Área de detalhes */}
      <label className='record-card__label'>
        Detalhes / diligências:
        <textarea
          className='record-card__details'
          value={record.details}
          onChange={handleDetails}
          placeholder={`Exemplo:
[✔️] # DELOS: Nome Jão da Silva, CPF 123.123.123-00;
[🕒] --DELOS(CPF): Aguardando ofício;
[❌] # SITTEL: Fazer e enviar;
`}
          rows={4}
        />
      </label>

      {/* Rodapé */}
      <footer className='record-card__footer'>
        <div className='record-card__snippet-group'>
          <button
            type='button'
            className='record-card__snippet-btn'
            onClick={() => copy('[🕒] --DELOS(CPF): ')}
          >
            🕒 Aguardando
          </button>

          <button
            type='button'
            className='record-card__snippet-btn'
            onClick={() => copy('[❌] # SITTEL: ')}
          >
            ❌ A fazer
          </button>

          <button
            type='button'
            className='record-card__snippet-btn'
            onClick={() => copy('[✔️] # DELOS: ')}
          >
            ✔️ Respondido
          </button>
        </div>

        <button type='button' className='record-card__delete-btn' onClick={onDelete}>
          Excluir registro
        </button>
      </footer>
    </article>
  );
}
