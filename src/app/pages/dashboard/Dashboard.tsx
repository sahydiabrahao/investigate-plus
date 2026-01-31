import './Dashboard.scss';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { DirNode } from '@/utils/read-directory-tree';
import {
  INVESTIGATION_FILE,
  META_ORDER,
  META_SUGGESTIONS,
} from '@/constants/investigation.constants';
import { createNewInvestigation } from '@/utils/create-investigation';
import NotesRichEditor from '@/app/components/notes-rich-editor/NotesRichEditor';

type LoadState =
  | { status: 'idle' }
  | { status: 'no-root' }
  | { status: 'no-case-selected' }
  | { status: 'invalid-case-selected' }
  | { status: 'loading' }
  | { status: 'missing-file'; caseDirName: string }
  | { status: 'ready'; caseDirName: string; json: unknown }
  | { status: 'error'; message: string };

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type MetaItem = { key: string; value: string };

function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'JSON inválido (não foi possível fazer parse).' };
  }
}

function findDirNodeByPath(tree: DirNode | null, targetPath: string): DirNode | null {
  if (!tree) return null;
  if (tree.path === targetPath && tree.type === 'directory') return tree;

  for (const child of tree.children) {
    if (child.type === 'directory') {
      const found = findDirNodeByPath(child, targetPath);
      if (found) return found;
    }
  }

  return null;
}

function isCaseRoot(tree: DirNode | null, dirPath: string): boolean {
  if (!tree) return false;
  return tree.children.some((child) => child.type === 'directory' && child.path === dirPath);
}

async function tryGetInvestigationFile(
  caseDir: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle | null> {
  try {
    return await caseDir.getFileHandle(INVESTIGATION_FILE);
  } catch {
    return null;
  }
}

async function createInvestigationFile(
  caseDir: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle> {
  const fileHandle = await caseDir.getFileHandle(INVESTIGATION_FILE, { create: true });

  const initial = createNewInvestigation();

  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(initial, null, 2));
  await writable.close();

  return fileHandle;
}

export default function Dashboard() {
  const { rootHandle, dirTree, selectedCasePath } = useWorkspace();

  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const [notesDraft, setNotesDraft] = useState<unknown | null>(null);
  const [metaDraft, setMetaDraft] = useState<MetaItem[]>([]);

  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [isMetaAddOpen, setIsMetaAddOpen] = useState(false);
  const metaAddRef = useRef<HTMLDivElement | null>(null);

  const metaInputRefs = useRef<Array<HTMLInputElement | HTMLTextAreaElement | null>>([]);
  const focusMetaIndexRef = useRef<number | null>(null);

  const metaSuggestions = useMemo(() => [...META_SUGGESTIONS], []);

  const metaOrderIndex = useMemo(() => {
    const map = new Map<string, number>();
    META_ORDER.forEach((k, i) => map.set(k, i));
    return map;
  }, []);

  function sortMeta(items: MetaItem[]) {
    const indexed = items.map((it, originalIndex) => ({ it, originalIndex }));
    indexed.sort((a, b) => {
      const ai = metaOrderIndex.get(a.it.key) ?? Number.POSITIVE_INFINITY;
      const bi = metaOrderIndex.get(b.it.key) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return a.originalIndex - b.originalIndex;
    });
    return indexed.map((x) => x.it);
  }

  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  function getMeasureCanvas(): HTMLCanvasElement {
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement('canvas');
    }
    return measureCanvasRef.current;
  }

  function autosizeInput(el: HTMLInputElement, value: string) {
    const style = window.getComputedStyle(el);
    const font = style.font || `${style.fontSize} ${style.fontFamily}`;

    const canvas = getMeasureCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = font;

    const text = value && value.length > 0 ? value : '—';
    const measured = ctx.measureText(text).width;

    const paddingLeft = Number.parseFloat(style.paddingLeft || '0') || 0;
    const paddingRight = Number.parseFloat(style.paddingRight || '0') || 0;
    const borders =
      (Number.parseFloat(style.borderLeftWidth || '0') || 0) +
      (Number.parseFloat(style.borderRightWidth || '0') || 0);

    const extra = 14;
    const next = measured + paddingLeft + paddingRight + borders + extra;

    const max = 520;

    const clamped = Math.min(max, next);
    el.style.width = `${Math.round(clamped)}px`;
  }

  function autosizeTextarea(el: HTMLTextAreaElement) {
    // reset to recompute correctly
    el.style.height = '0px';
    const next = el.scrollHeight;
    el.style.height = `${next}px`;
  }

  async function saveDraftToFile(next: { notesState: unknown | null; meta: MetaItem[] }) {
    const fh = fileHandleRef.current;
    if (!fh) return;

    const file = await fh.getFile();
    const text = await file.text();

    const parsed = safeJsonParse(text);
    if (!parsed.ok) throw new Error(parsed.error);

    interface Investigation {
      meta?: MetaItem[];
      notesRich?: { state?: unknown };
      updatedAt?: string;
    }

    const json = parsed.value as Investigation;

    json.meta = next.meta;

    json.notesRich = json.notesRich ?? {};
    json.notesRich.state = next.notesState ?? null;

    json.updatedAt = new Date().toISOString();

    const nextText = JSON.stringify(json, null, 2);

    if (nextText === lastSavedSnapshotRef.current) return;

    const writable = await fh.createWritable();
    await writable.write(nextText);
    await writable.close();

    lastSavedSnapshotRef.current = nextText;
  }

  useEffect(() => {
    let cancelled = false;

    fileHandleRef.current = null;
    lastSavedSnapshotRef.current = '';
    setSaveStatus('idle');

    setNotesDraft(null);
    setMetaDraft([]);

    (async () => {
      if (!rootHandle) {
        setState({ status: 'no-root' });
        return;
      }

      if (!selectedCasePath) {
        setState({ status: 'no-case-selected' });
        return;
      }

      if (!isCaseRoot(dirTree, selectedCasePath)) {
        setState({ status: 'invalid-case-selected' });
        return;
      }

      const caseNode = findDirNodeByPath(dirTree, selectedCasePath);

      if (!caseNode) {
        setState({ status: 'error', message: 'Pasta do caso não encontrada na árvore.' });
        return;
      }

      setState({ status: 'loading' });

      const fileHandle = await tryGetInvestigationFile(caseNode.handle);

      if (cancelled) return;

      if (!fileHandle) {
        setState({ status: 'missing-file', caseDirName: caseNode.name });
        return;
      }

      fileHandleRef.current = fileHandle;

      const file = await fileHandle.getFile();
      const text = await file.text();

      if (cancelled) return;

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setState({ status: 'error', message: parsed.error });
        return;
      }

      interface Investigation {
        meta?: MetaItem[];
        notesRich?: { state?: unknown };
      }

      const loaded = parsed.value as Investigation;

      const rawMeta = Array.isArray(loaded?.meta) ? loaded.meta : [];
      setMetaDraft(sortMeta(rawMeta));

      setNotesDraft(loaded?.notesRich?.state ?? null);

      setSaveStatus('idle');

      lastSavedSnapshotRef.current = JSON.stringify(parsed.value, null, 2);

      setState({
        status: 'ready',
        caseDirName: caseNode.name,
        json: parsed.value,
      });
    })().catch((e) => {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Erro inesperado.' });
    });

    return () => {
      cancelled = true;
    };
  }, [rootHandle, dirTree, selectedCasePath, metaOrderIndex]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    if (saveStatus !== 'dirty') return;
    if (!fileHandleRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      (async () => {
        try {
          setSaveStatus('saving');
          await saveDraftToFile({ notesState: notesDraft, meta: metaDraft });
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      })();
    }, 900);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [notesDraft, metaDraft, saveStatus, state.status]);

  useEffect(() => {
    const idx = focusMetaIndexRef.current;
    if (idx == null) return;

    const el = metaInputRefs.current[idx];
    if (!el) return;

    focusMetaIndexRef.current = null;

    window.setTimeout(() => {
      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  }, [metaDraft]);

  useEffect(() => {
    metaDraft.forEach((item, idx) => {
      const el = metaInputRefs.current[idx];

      if (el instanceof HTMLInputElement) {
        autosizeInput(el, item.value);
      }

      if (el instanceof HTMLTextAreaElement) {
        autosizeTextarea(el);
      }
    });
  }, [metaDraft]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!isMetaAddOpen) return;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const inside = metaAddRef.current?.contains(t) ?? false;
      if (!inside) setIsMetaAddOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isMetaAddOpen]);

  async function handleCreateInvestigation() {
    if (!selectedCasePath) return;

    if (!isCaseRoot(dirTree, selectedCasePath)) {
      setState({ status: 'invalid-case-selected' });
      return;
    }

    const caseNode = findDirNodeByPath(dirTree, selectedCasePath);
    if (!caseNode) {
      setState({ status: 'error', message: 'Pasta do caso não encontrada na árvore.' });
      return;
    }

    try {
      setState({ status: 'loading' });

      const fileHandle = await createInvestigationFile(caseNode.handle);
      fileHandleRef.current = fileHandle;

      const file = await fileHandle.getFile();
      const text = await file.text();

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setState({ status: 'error', message: parsed.error });
        return;
      }

      interface Investigation {
        meta?: MetaItem[];
        notesRich?: { state?: unknown };
      }

      const created = parsed.value as Investigation;

      const rawMeta = Array.isArray(created?.meta) ? created.meta : [];
      setMetaDraft(sortMeta(rawMeta));

      setNotesDraft(created?.notesRich?.state ?? null);
      setSaveStatus('idle');

      lastSavedSnapshotRef.current = JSON.stringify(parsed.value, null, 2);

      setState({
        status: 'ready',
        caseDirName: caseNode.name,
        json: parsed.value,
      });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Erro inesperado.' });
    }
  }

  function addMetaItem(key: string) {
    setMetaDraft((prev) => {
      const newItem: MetaItem = { key, value: '' };
      const next = sortMeta([...prev, newItem]);

      const newIndex = next.indexOf(newItem);
      focusMetaIndexRef.current = newIndex >= 0 ? newIndex : next.length - 1;

      return next;
    });

    setSaveStatus('dirty');
    setIsMetaAddOpen(false);
  }

  function removeMetaItem(index: number) {
    setMetaDraft((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return sortMeta(next);
    });
    setSaveStatus('dirty');
  }

  function updateMetaValue(index: number, value: string) {
    setMetaDraft((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
    setSaveStatus('dirty');
  }

  if (state.status === 'no-root') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Nenhuma pasta importada</h1>
        <p className='dashboard__hint'>Use o botão Import para escolher a pasta “investigando”.</p>
      </div>
    );
  }

  if (state.status === 'no-case-selected') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Nenhum caso selecionado</h1>
        <p className='dashboard__hint'>
          Selecione um caso na barra lateral para abrir a investigação.
        </p>
      </div>
    );
  }

  if (state.status === 'invalid-case-selected') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Seleção inválida</h1>
        <p className='dashboard__hint'>
          Selecione a pasta principal do caso (filha direta da pasta importada).
        </p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Investigação</h1>
        <p className='dashboard__hint'>Carregando…</p>
      </div>
    );
  }

  if (state.status === 'missing-file') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Investigação</h1>
        <div className='dashboard__meta'>
          <div className='dashboard__row'>
            <span className='dashboard__label'>CASO</span>
            <span className='dashboard__value'>{state.caseDirName}</span>
          </div>
        </div>

        <p className='dashboard__hint'>
          Arquivo não encontrado. Você pode criar uma investigação nova para este caso.
        </p>

        <button type='button' className='dashboard__primary' onClick={handleCreateInvestigation}>
          Criar nova investigação
        </button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Erro</h1>
        <p className='dashboard__hint'>{state.message}</p>
      </div>
    );
  }

  if (state.status === 'ready') {
    interface Investigation {
      notesRich?: { state?: unknown };
    }

    const investigation = state.json as Investigation;
    const initialNotesState = investigation?.notesRich?.state;

    return (
      <div className='dashboard'>
        <div className='dashboard__header'>
          <h1 className='dashboard__title'>{state.caseDirName}</h1>
          <div className='dashboard__header-actions' ref={metaAddRef}>
            <button
              type='button'
              className='dashboard__btn'
              onClick={() => setIsMetaAddOpen((v) => !v)}
              aria-haspopup='menu'
              aria-expanded={isMetaAddOpen}
              title='Adicionar metadado'
            >
              Adicionar
            </button>

            {isMetaAddOpen && (
              <div className='dashboard__meta-popover' role='menu' aria-label='Adicionar metadado'>
                {metaSuggestions.map((k) => (
                  <button
                    key={k}
                    type='button'
                    className='dashboard__meta-popover-item'
                    onClick={() => addMetaItem(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}

            <div className='dashboard__status'>
              {saveStatus === 'saving' && 'Salvando…'}
              {saveStatus === 'saved' && 'Salvo'}
              {saveStatus === 'error' && 'Não foi possível salvar'}
              {saveStatus === 'dirty' && 'Não salvo'}
            </div>
          </div>
        </div>

        <div className='dashboard__meta'>
          {metaDraft.length > 0 && (
            <div className='dashboard__meta-list'>
              {metaDraft.map((item, idx) => {
                const isResumo = item.key === 'RESUMO';

                return (
                  <div
                    key={`${item.key}-${idx}`}
                    className={`dashboard__row ${isResumo ? 'dashboard__row--full' : ''}`}
                  >
                    <span className='dashboard__label'>{item.key}</span>

                    {isResumo ? (
                      <textarea
                        ref={(el) => {
                          metaInputRefs.current[idx] = el;
                          if (el) autosizeTextarea(el);
                        }}
                        className='dashboard__field dashboard__field--textarea'
                        rows={1}
                        value={item.value}
                        onChange={(e) => {
                          autosizeTextarea(e.currentTarget);
                          updateMetaValue(idx, e.currentTarget.value);
                        }}
                        placeholder='Escreva um resumo curto…'
                      />
                    ) : (
                      <input
                        ref={(el) => {
                          metaInputRefs.current[idx] = el;
                          if (el) autosizeInput(el, item.value);
                        }}
                        className='dashboard__field'
                        value={item.value}
                        onChange={(e) => {
                          autosizeInput(e.currentTarget, e.currentTarget.value);
                          updateMetaValue(idx, e.currentTarget.value);
                        }}
                        placeholder='—'
                      />
                    )}

                    <div className='dashboard__actions'>
                      <button
                        type='button'
                        className='dashboard__icon-btn'
                        onClick={() => removeMetaItem(idx)}
                        title='Remover'
                        aria-label='Remover'
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className='dashboard__section'>
          <NotesRichEditor
            initialState={notesDraft ?? initialNotesState}
            onChange={(nextState) => {
              setNotesDraft(nextState);
              setSaveStatus('dirty');
            }}
          />
        </div>
      </div>
    );
  }

  return <div className='dashboard' />;
}
