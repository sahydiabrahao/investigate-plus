import { useEffect, useRef } from 'react';
import './CaseListView.scss';

import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { CaseStatus } from '@/constants/investigation.constants';
import { CheckIcon, ReviewIcon, UrgentIcon, PendingIcon, WaitingIcon, NullIcon } from '@/app/icons';

type Props = {
  open: boolean;
  onClose: () => void;
};

function statusDataValue(s: CaseStatus | null | undefined): string {
  return s ?? 'NONE';
}

function renderStatusIcon(s: CaseStatus | null | undefined, size = 18) {
  if (!s) return <NullIcon size={size} color='white' />;
  if (s === 'PENDENTE') return <PendingIcon size={size} color='white' />;
  if (s === 'ANALISAR') return <ReviewIcon size={size} color='white' />;
  if (s === 'CONCLUIDO') return <CheckIcon size={size} color='white' />;
  if (s === 'URGENTE') return <UrgentIcon size={size} color='white' />;
  if (s === 'AGUARDANDO') return <WaitingIcon size={size} color='white' />;
  return <NullIcon size={size} color='white' />;
}

export default function CaseListView({ open, onClose }: Props) {
  const { cases, selectCase } = useWorkspace();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleOpenCase(casePath: string) {
    selectCase(casePath);
    onClose();
  }

  return (
    <div className='case-list' role='dialog' aria-modal='true' aria-label='Todos os casos'>
      <button type='button' className='case-list__backdrop' onClick={onClose} aria-label='Fechar' />

      <div className='case-list__panel'>
        <div className='case-list__header'>
          <div className='case-list__title'>Casos</div>

          <button
            ref={closeBtnRef}
            type='button'
            className='case-list__close'
            onClick={onClose}
            aria-label='Fechar'
          >
            ×
          </button>
        </div>

        <div className='case-list__content'>
          {cases.length === 0 ? (
            <div className='case-list__empty'>Nenhum caso encontrado.</div>
          ) : (
            <ul className='case-list__items'>
              {cases.map((c) => (
                <li key={c.path} className='case-list__item'>
                  <button
                    type='button'
                    className='case-list__card'
                    onClick={() => handleOpenCase(c.path)}
                    title={c.name}
                  >
                    <div className='case-list__card-top'>
                      <div className='case-list__name'>{c.name}</div>

                      <span
                        className='case-list__status'
                        data-status={statusDataValue(c.status)}
                        aria-hidden
                      >
                        {renderStatusIcon(c.status, 18)}
                      </span>
                    </div>

                    {c.meta.length > 0 && (
                      <div className='case-list__meta'>
                        {c.meta.map((m, idx) => (
                          <div key={`${m.key}-${idx}`} className='case-list__pill'>
                            <span className='case-list__pill-key'>{m.key}</span>
                            <span className='case-list__pill-value'>{m.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
