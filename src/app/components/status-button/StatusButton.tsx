import './StatusButton.scss';

import { useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_SUGGESTIONS, type CaseStatus } from '@/constants/investigation.constants';

import { CheckIcon, UrgentIcon, ReviewIcon, PendingIcon, WaitingIcon, NullIcon } from '@/app/icons';

type Props = {
  value: CaseStatus | null;
  onChange: (next: CaseStatus | null) => void;

  disabled?: boolean;
  size?: number;

  className?: string;
};

type StatusOption = {
  key: CaseStatus | null;
  label: string;
};

function statusLabel(s: CaseStatus): string {
  return s;
}

function statusDataValue(s: CaseStatus | null): string {
  return s ?? 'NONE';
}

export default function StatusButton({
  value,
  onChange,
  disabled = false,
  size = 28,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo<StatusOption[]>(() => {
    return [
      { key: null, label: 'SEM STATUS' },
      ...STATUS_SUGGESTIONS.map((s) => ({ key: s, label: statusLabel(s) })),
    ];
  }, []);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inside = wrapRef.current?.contains(t) ?? false;
      if (!inside) close();
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') close();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  function renderIcon(s: CaseStatus | null) {
    if (s === null) return <NullIcon size={size} />;

    if (s === 'PENDENTE') return <PendingIcon size={size} />;
    if (s === 'CONCLUIDO') return <CheckIcon size={size} />;
    if (s === 'ANALISAR') return <ReviewIcon size={size} />;
    if (s === 'URGENTE') return <UrgentIcon size={size} />;
    if (s === 'AGUARDANDO') return <WaitingIcon size={size} />;

    return <NullIcon size={size} />;
  }

  const title = value ? `Status: ${value}` : 'Status: sem status';

  return (
    <div
      ref={wrapRef}
      className={`status-button ${className ?? ''}`.trim()}
      data-open={open ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
    >
      <button
        type='button'
        className='status-button__trigger'
        title={title}
        aria-label={title}
        aria-haspopup='menu'
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className='status-button__trigger-icon'
          data-status={statusDataValue(value)}
          aria-hidden
        >
          {renderIcon(value)}
        </span>
      </button>

      {open && (
        <div className='status-button__popover' role='menu' aria-label='Selecionar status'>
          {options.map((opt) => {
            const isSelected = opt.key === value;
            const label = opt.key === null ? 'SEM STATUS' : opt.label;

            return (
              <button
                key={opt.key ?? '__null__'}
                type='button'
                className='status-button__item'
                role='menuitem'
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => {
                  onChange(opt.key);
                  close();
                }}
                title={label}
              >
                <span
                  className='status-button__item-icon'
                  data-status={statusDataValue(opt.key)}
                  aria-hidden
                >
                  {renderIcon(opt.key)}
                </span>
                <span className='status-button__item-label'>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
