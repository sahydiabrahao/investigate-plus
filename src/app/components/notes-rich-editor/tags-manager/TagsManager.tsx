import './TagsManager.scss';

import React, { useMemo, useRef, useState } from 'react';
import { useTags } from '@/app/hooks/useTags';
import type { TagDefinition, TagStyleId } from '@/types/tag.types';

type Mode =
  | { type: 'idle' }
  | { type: 'create' }
  | { type: 'edit'; id: string }
  | { type: 'import' }
  | { type: 'export' };

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file);
  });
}

function styleLabel(styleId: TagStyleId) {
  const map: Record<TagStyleId, string> = {
    1: 'Amarelo',
    2: 'Verde',
    3: 'Azul',
    4: 'Rosa',
    5: 'Vermelho',
  };
  return map[styleId];
}

const STYLE_IDS: readonly TagStyleId[] = [1, 2, 3, 4, 5] as const;

export default function TagsManager() {
  const { loading, items, addTag, updateTag, removeTag, importFromJsonText, exportToJsonText } =
    useTags();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ type: 'idle' });

  const [labelDraft, setLabelDraft] = useState('');
  const [styleDraft, setStyleDraft] = useState<TagStyleId>(1);

  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportText = useMemo(() => exportToJsonText(), [exportToJsonText]);

  const editingItem: TagDefinition | null = useMemo(() => {
    if (mode.type !== 'edit') return null;
    return items.find((x) => x.id === mode.id) ?? null;
  }, [items, mode]);

  function resetDrafts() {
    setLabelDraft('');
    setStyleDraft(1);
  }

  function closeAll() {
    setOpen(false);
    setMode({ type: 'idle' });
    resetDrafts();
    setImportError(null);
    setImportBusy(false);
  }

  function openCreate() {
    resetDrafts();
    setImportError(null);
    setMode({ type: 'create' });
  }

  function openEdit(item: TagDefinition) {
    setLabelDraft(item.label);
    setStyleDraft(item.styleId);
    setImportError(null);
    setMode({ type: 'edit', id: item.id });
  }

  function openImport() {
    setImportError(null);
    setMode({ type: 'import' });
  }

  function openExport() {
    setImportError(null);
    setMode({ type: 'export' });
  }

  async function submitCreate() {
    await addTag({
      label: labelDraft,
      styleId: styleDraft,
    });
    setMode({ type: 'idle' });
    resetDrafts();
  }

  async function submitEdit(id: string) {
    await updateTag(id, {
      label: labelDraft,
      styleId: styleDraft,
    });
    setMode({ type: 'idle' });
    resetDrafts();
  }

  async function submitRemove(id: string) {
    await removeTag(id);
    if (mode.type === 'edit' && mode.id === id) {
      setMode({ type: 'idle' });
      resetDrafts();
    }
  }

  async function handlePickImportFile(file: File) {
    setImportError(null);
    setImportBusy(true);

    try {
      const text = await readFileAsText(file);
      const res = await importFromJsonText(text);
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      setMode({ type: 'idle' });
    } catch {
      setImportError('Não foi possível importar este arquivo.');
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inside = wrapRef.current?.contains(t) ?? false;
      if (!inside) closeAll();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const canSave = labelDraft.trim().length > 0;

  return (
    <div className='tags-manager' ref={wrapRef}>
      <button
        type='button'
        className='tags-manager__btn'
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) closeAll();
          if (next) setMode({ type: 'idle' });
        }}
        title='Tags'
        aria-haspopup='menu'
        aria-expanded={open}
      >
        #
      </button>

      {open && (
        <div className='tags-manager__popover' role='menu' aria-label='Tags'>
          <div className='tags-manager__top'>
            <button type='button' className='tags-manager__top-btn' onClick={openCreate}>
              Novo
            </button>

            <div className='tags-manager__top-right'>
              <button type='button' className='tags-manager__top-btn' onClick={openImport}>
                Importar
              </button>
              <button type='button' className='tags-manager__top-btn' onClick={openExport}>
                Exportar
              </button>
            </div>
          </div>

          <div className='tags-manager__body'>
            {loading ? (
              <div className='tags-manager__empty'>Carregando…</div>
            ) : items.length === 0 ? (
              <div className='tags-manager__empty'>Nenhuma tag criada.</div>
            ) : (
              <div className='tags-manager__list'>
                {items.map((it) => (
                  <button
                    key={it.id}
                    type='button'
                    className='tags-manager__row'
                    onClick={() => openEdit(it)}
                    title='Editar'
                  >
                    <span className={`tags-manager__chip tags-manager__chip--s${it.styleId}`}>
                      {it.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {mode.type === 'create' && (
              <div className='tags-manager__panel'>
                <div className='tags-manager__panel-title'>Nova tag</div>

                <label className='tags-manager__label'>
                  Nome ou ícone
                  <input
                    className='tags-manager__input'
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.currentTarget.value)}
                    placeholder='OF ou 📱'
                    autoFocus
                  />
                </label>

                <label className='tags-manager__label'>
                  Estilo
                  <div className='tags-manager__style-picker' role='listbox' aria-label='Estilo'>
                    {STYLE_IDS.map((id) => (
                      <button
                        key={id}
                        type='button'
                        className={`tags-manager__style-option ${id === styleDraft ? 'is-active' : ''}`}
                        onClick={() => setStyleDraft(id)}
                        role='option'
                        aria-selected={id === styleDraft}
                        title={styleLabel(id)}
                      >
                        <span className={`tags-manager__chip tags-manager__chip--s${id}`}>
                          {labelDraft.trim() ? labelDraft.trim() : '#'}
                        </span>
                      </button>
                    ))}
                  </div>
                </label>

                <div className='tags-manager__actions'>
                  <button
                    type='button'
                    className='tags-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Cancelar
                  </button>
                  <button
                    type='button'
                    className='tags-manager__action tags-manager__action--primary'
                    onClick={submitCreate}
                    disabled={!canSave}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {mode.type === 'edit' && editingItem && (
              <div className='tags-manager__panel'>
                <div className='tags-manager__panel-title'>Editar tag</div>

                <label className='tags-manager__label'>
                  Nome ou ícone
                  <input
                    className='tags-manager__input'
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.currentTarget.value)}
                    placeholder='OF ou 📱'
                    autoFocus
                  />
                </label>

                <label className='tags-manager__label'>
                  Estilo
                  <div className='tags-manager__style-picker' role='listbox' aria-label='Estilo'>
                    {STYLE_IDS.map((id) => (
                      <button
                        key={id}
                        type='button'
                        className={`tags-manager__style-option ${id === styleDraft ? 'is-active' : ''}`}
                        onClick={() => setStyleDraft(id)}
                        role='option'
                        aria-selected={id === styleDraft}
                        title={styleLabel(id)}
                      >
                        <span className={`tags-manager__chip tags-manager__chip--s${id}`}>
                          {labelDraft.trim() ? labelDraft.trim() : '#'}
                        </span>
                      </button>
                    ))}
                  </div>
                </label>

                <div className='tags-manager__actions'>
                  <button
                    type='button'
                    className='tags-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='tags-manager__action tags-manager__action--danger'
                    onClick={() => void submitRemove(editingItem.id)}
                    title='Remover'
                  >
                    Remover
                  </button>

                  <button
                    type='button'
                    className='tags-manager__action tags-manager__action--primary'
                    onClick={() => void submitEdit(editingItem.id)}
                    disabled={!canSave}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {mode.type === 'import' && (
              <div className='tags-manager__panel'>
                <div className='tags-manager__panel-title'>Importar</div>

                <input
                  ref={fileInputRef}
                  className='tags-manager__file'
                  type='file'
                  accept='application/json,.json'
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    if (!f) return;
                    void handlePickImportFile(f);
                  }}
                />

                <div className='tags-manager__actions'>
                  <button
                    type='button'
                    className='tags-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                    disabled={importBusy}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='tags-manager__action tags-manager__action--primary'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importBusy}
                  >
                    {importBusy ? 'Importando…' : 'Escolher arquivo'}
                  </button>
                </div>

                {importError && <div className='tags-manager__error'>{importError}</div>}
              </div>
            )}

            {mode.type === 'export' && (
              <div className='tags-manager__panel'>
                <div className='tags-manager__panel-title'>Exportar</div>

                <textarea
                  className='tags-manager__textarea tags-manager__textarea--export'
                  value={exportText}
                  readOnly
                  rows={6}
                />

                <div className='tags-manager__actions'>
                  <button
                    type='button'
                    className='tags-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='tags-manager__action tags-manager__action--primary'
                    onClick={() => downloadTextFile('tags.json', exportText)}
                  >
                    Baixar JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
