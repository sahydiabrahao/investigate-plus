import { useEffect, useMemo, useRef, useState } from 'react';
import './CaseListView.scss';

import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { CaseStatus } from '@/constants/investigation.constants';
import { CheckIcon, ReviewIcon, UrgentIcon, PendingIcon, WaitingIcon, NullIcon } from '@/app/icons';
import { META_ORDER } from '@/constants/investigation.constants';

type Props = {
  open: boolean;
  onClose: () => void;
};

type ViewMode =
  | 'OC_DESC'
  | 'OC_ASC'
  | 'IP_ASC'
  | 'MC_ASC'
  | 'CRIME_ASC'
  | 'CRIME_DESC'
  | 'STATUS_URGENTE'
  | 'STATUS_PENDENTE'
  | 'STATUS_AGUARDANDO'
  | 'STATUS_ANALISAR'
  | 'STATUS_CONCLUIDO'
  | 'STATUS_NONE';

export type MetaKey = (typeof META_ORDER)[number];

function isMetaKey(value: string): value is MetaKey {
  return META_ORDER.includes(value as MetaKey);
}

function sortMetaByOrder(meta: { key: string; value: string }[]) {
  return [...meta].sort((a, b) => {
    const ak = a.key.toUpperCase();
    const bk = b.key.toUpperCase();

    const ai = isMetaKey(ak) ? META_ORDER.indexOf(ak) : META_ORDER.length;
    const bi = isMetaKey(bk) ? META_ORDER.indexOf(bk) : META_ORDER.length;

    return ai - bi;
  });
}

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

function safeDateValue(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function compareOc(
  a: { year: number; number: number; dp: number | null } | null,
  b: { year: number; number: number; dp: number | null } | null,
): number {
  if (a && b) return b.year - a.year || b.number - a.number || (a.dp ?? 0) - (b.dp ?? 0);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

export default function CaseListView({ open, onClose }: Props) {
  const { cases, selectCase } = useWorkspace();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('OC_DESC');

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

  function handleOpenCase(casePath: string) {
    selectCase(casePath);
    onClose();
  }

  function clearMode() {
    setViewMode('OC_DESC');
  }

  const isDefault = viewMode === 'OC_DESC';

  const visibleCases = useMemo(() => {
    if (!open) return [];

    let list = [...cases];

    if (viewMode.startsWith('STATUS_')) {
      if (viewMode === 'STATUS_NONE') list = list.filter((c) => !c.status);
      if (viewMode === 'STATUS_URGENTE') list = list.filter((c) => c.status === 'URGENTE');
      if (viewMode === 'STATUS_PENDENTE') list = list.filter((c) => c.status === 'PENDENTE');
      if (viewMode === 'STATUS_AGUARDANDO') list = list.filter((c) => c.status === 'AGUARDANDO');
      if (viewMode === 'STATUS_ANALISAR') list = list.filter((c) => c.status === 'ANALISAR');
      if (viewMode === 'STATUS_CONCLUIDO') list = list.filter((c) => c.status === 'CONCLUIDO');
    }

    list.sort((a, b) => {
      const fallback =
        safeDateValue(b.updatedAt) - safeDateValue(a.updatedAt) || a.name.localeCompare(b.name);

      if (viewMode === 'OC_DESC') {
        const oc = compareOc(a.oc, b.oc);
        return oc !== 0 ? oc : fallback;
      }

      if (viewMode === 'OC_ASC') {
        const oc = compareOc(b.oc, a.oc);
        return oc !== 0 ? oc : fallback;
      }

      if (viewMode === 'IP_ASC') {
        const ai = a.ipNumber;
        const bi = b.ipNumber;

        if (ai != null && bi != null) return ai - bi;
        if (ai != null) return -1;
        if (bi != null) return 1;
        return fallback;
      }

      if (viewMode === 'MC_ASC') {
        const am = a.mcNumber;
        const bm = b.mcNumber;

        if (am != null && bm != null) return am - bm;
        if (am != null) return -1;
        if (bm != null) return 1;
        return fallback;
      }

      if (viewMode === 'CRIME_ASC') {
        const ac = a.crimeNormalized ?? '';
        const bc = b.crimeNormalized ?? '';
        const r = ac.localeCompare(bc);
        return r !== 0 ? r : fallback;
      }

      if (viewMode === 'CRIME_DESC') {
        const ac = a.crimeNormalized ?? '';
        const bc = b.crimeNormalized ?? '';
        const r = bc.localeCompare(ac);
        return r !== 0 ? r : fallback;
      }

      return fallback;
    });

    return list;
  }, [open, cases, viewMode]);

  if (!open) return null;

  return (
    <div className='case-list' role='dialog' aria-modal='true' aria-label='Todos os casos'>
      <button type='button' className='case-list__backdrop' onClick={onClose} aria-label='Fechar' />

      <div className='case-list__panel'>
        <button
          ref={closeBtnRef}
          type='button'
          className='case-list__sr-close'
          onClick={onClose}
          aria-label='Fechar'
        />

        <div className='case-list__filters' aria-label='Modo de exibição'>
          <div className='case-list__filters-row'>
            <div className='case-list__field case-list__field--grow'>
              <label className='case-list__label' htmlFor='case-mode'>
                Modo de exibição
              </label>

              <select
                id='case-mode'
                className='case-list__select'
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
              >
                <optgroup label='Ordenar'>
                  <option value='OC_DESC'>Ocorrência (mais novas)</option>
                  <option value='OC_ASC'>Ocorrência (mais antigas)</option>
                  <option value='IP_ASC'>IP</option>
                  <option value='MC_ASC'>MC</option>
                  <option value='CRIME_ASC'>Crime (A → Z)</option>
                  <option value='CRIME_DESC'>Crime (Z → A)</option>
                </optgroup>

                <optgroup label='Filtrar'>
                  <option value='STATUS_URGENTE'>Urgente</option>
                  <option value='STATUS_PENDENTE'>Pendente</option>
                  <option value='STATUS_AGUARDANDO'>Aguardando</option>
                  <option value='STATUS_ANALISAR'>Analisar</option>
                  <option value='STATUS_CONCLUIDO'>Concluído</option>
                  <option value='STATUS_NONE'>Sem status</option>
                </optgroup>
              </select>
            </div>

            <button
              type='button'
              className='case-list__clear'
              onClick={clearMode}
              disabled={isDefault}
              aria-disabled={isDefault}
              title={isDefault ? 'Já está no padrão' : 'Voltar ao padrão'}
            >
              Limpar
            </button>
          </div>
        </div>

        <div className='case-list__content'>
          {visibleCases.length === 0 ? (
            <div className='case-list__empty'>Nenhum caso encontrado.</div>
          ) : (
            <ul className='case-list__items'>
              {visibleCases.map((c) => (
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
                        {sortMetaByOrder(c.meta).map((m, idx) => (
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
