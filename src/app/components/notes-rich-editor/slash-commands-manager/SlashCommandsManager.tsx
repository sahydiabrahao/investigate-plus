import './SlashCommandsManager.scss';

import React, { useMemo, useRef, useState } from 'react';
import { useSlashCommands } from '@/app/hooks/useSlashCommands';
import type { SlashCommand } from '@/types/slash-commands.types';

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

export default function SlashCommandsManager() {
  const {
    loading,
    items,
    addCommand,
    updateCommand,
    removeCommand,
    importFromJsonText,
    exportToJsonText,
  } = useSlashCommands();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ type: 'idle' });

  const [triggerDraft, setTriggerDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');

  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportText = useMemo(() => exportToJsonText(), [exportToJsonText]);

  const editingItem: SlashCommand | null = useMemo(() => {
    if (mode.type !== 'edit') return null;
    return items.find((x) => x.id === mode.id) ?? null;
  }, [items, mode]);

  function resetDrafts() {
    setTriggerDraft('');
    setTemplateDraft('');
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

  function openEdit(item: SlashCommand) {
    setTriggerDraft(item.trigger);
    setTemplateDraft(item.template);
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
    await addCommand({ trigger: triggerDraft, template: templateDraft });
    setMode({ type: 'idle' });
    resetDrafts();
  }

  async function submitEdit(id: string) {
    await updateCommand(id, { trigger: triggerDraft, template: templateDraft });
    setMode({ type: 'idle' });
    resetDrafts();
  }

  async function submitRemove(id: string) {
    await removeCommand(id);
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

  return (
    <div className='slash-manager' ref={wrapRef}>
      <button
        type='button'
        className='slash-manager__btn'
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) closeAll();
          if (next) setMode({ type: 'idle' });
        }}
        title='Atalhos'
        aria-haspopup='menu'
        aria-expanded={open}
      >
        ⌘
      </button>

      {open && (
        <div className='slash-manager__popover' role='menu' aria-label='Atalhos'>
          <div className='slash-manager__top'>
            <button type='button' className='slash-manager__top-btn' onClick={openCreate}>
              Novo
            </button>

            <div className='slash-manager__top-right'>
              <button type='button' className='slash-manager__top-btn' onClick={openImport}>
                Importar
              </button>
              <button type='button' className='slash-manager__top-btn' onClick={openExport}>
                Exportar
              </button>
            </div>
          </div>

          <div className='slash-manager__body'>
            {loading ? (
              <div className='slash-manager__empty'>Carregando…</div>
            ) : items.length === 0 ? (
              <div className='slash-manager__empty'>Nenhum atalho criado.</div>
            ) : (
              <div className='slash-manager__list'>
                {items.map((it) => (
                  <button
                    key={it.id}
                    type='button'
                    className='slash-manager__row'
                    onClick={() => openEdit(it)}
                    title='Editar'
                  >
                    <span className='slash-manager__row-trigger'>{it.trigger}</span>
                    <span className='slash-manager__row-preview'>
                      {it.template.length > 54 ? `${it.template.slice(0, 54)}…` : it.template}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {mode.type === 'create' && (
              <div className='slash-manager__panel'>
                <div className='slash-manager__panel-title'>Novo atalho</div>

                <label className='slash-manager__label'>
                  Trigger
                  <input
                    className='slash-manager__input'
                    value={triggerDraft}
                    onChange={(e) => setTriggerDraft(e.currentTarget.value)}
                    placeholder='/atalho'
                    autoFocus
                  />
                </label>

                <label className='slash-manager__label'>
                  Template
                  <textarea
                    className='slash-manager__textarea'
                    value={templateDraft}
                    onChange={(e) => setTemplateDraft(e.currentTarget.value)}
                    placeholder='Texto inserido ao confirmar…'
                    rows={3}
                  />
                </label>

                <div className='slash-manager__actions'>
                  <button
                    type='button'
                    className='slash-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Cancelar
                  </button>
                  <button
                    type='button'
                    className='slash-manager__action slash-manager__action--primary'
                    onClick={submitCreate}
                    disabled={triggerDraft.trim().length === 0}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {mode.type === 'edit' && editingItem && (
              <div className='slash-manager__panel'>
                <div className='slash-manager__panel-title'>Editar atalho</div>

                <label className='slash-manager__label'>
                  Trigger
                  <input
                    className='slash-manager__input'
                    value={triggerDraft}
                    onChange={(e) => setTriggerDraft(e.currentTarget.value)}
                    placeholder='/atalho'
                    autoFocus
                  />
                </label>

                <label className='slash-manager__label'>
                  Template
                  <textarea
                    className='slash-manager__textarea'
                    value={templateDraft}
                    onChange={(e) => setTemplateDraft(e.currentTarget.value)}
                    placeholder='Texto inserido ao confirmar…'
                    rows={3}
                  />
                </label>

                <div className='slash-manager__actions'>
                  <button
                    type='button'
                    className='slash-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='slash-manager__action slash-manager__action--danger'
                    onClick={() => void submitRemove(editingItem.id)}
                    title='Remover'
                  >
                    Remover
                  </button>

                  <button
                    type='button'
                    className='slash-manager__action slash-manager__action--primary'
                    onClick={() => void submitEdit(editingItem.id)}
                    disabled={triggerDraft.trim().length === 0}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {mode.type === 'import' && (
              <div className='slash-manager__panel'>
                <div className='slash-manager__panel-title'>Importar</div>

                <input
                  ref={fileInputRef}
                  className='slash-manager__file'
                  type='file'
                  accept='application/json,.json'
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    if (!f) return;
                    void handlePickImportFile(f);
                  }}
                />

                <div className='slash-manager__actions'>
                  <button
                    type='button'
                    className='slash-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                    disabled={importBusy}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='slash-manager__action slash-manager__action--primary'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importBusy}
                  >
                    {importBusy ? 'Importando…' : 'Escolher arquivo'}
                  </button>
                </div>

                {importError && <div className='slash-manager__error'>{importError}</div>}
              </div>
            )}

            {mode.type === 'export' && (
              <div className='slash-manager__panel'>
                <div className='slash-manager__panel-title'>Exportar</div>

                <textarea
                  className='slash-manager__textarea slash-manager__textarea--export'
                  value={exportText}
                  readOnly
                  rows={6}
                />

                <div className='slash-manager__actions'>
                  <button
                    type='button'
                    className='slash-manager__action'
                    onClick={() => setMode({ type: 'idle' })}
                  >
                    Fechar
                  </button>

                  <button
                    type='button'
                    className='slash-manager__action slash-manager__action--primary'
                    onClick={() => downloadTextFile('slash-commands.json', exportText)}
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
