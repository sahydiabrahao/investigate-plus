import './Dashboard.scss';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { DirNode } from '@/utils/read-directory-tree';
import { INVESTIGATION_FILE } from '@/constants/investigation.constants';
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

  // Autosave infra (mantém fora do state para não re-renderizar)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  async function saveNotesDraftToFile(nextNotesState: unknown) {
    const fh = fileHandleRef.current;
    if (!fh) return;

    const file = await fh.getFile();
    const text = await file.text();

    const parsed = safeJsonParse(text);
    if (!parsed.ok) throw new Error(parsed.error);

    interface Investigation {
      notesRich?: {
        state?: unknown;
      };
    }

    const json = parsed.value as Investigation;
    json.notesRich = json.notesRich ?? {};
    json.notesRich.state = nextNotesState;

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

      // mantém o handle para autosave
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
        notesRich?: {
          state?: unknown;
        };
      }

      const loaded = parsed.value as Investigation;

      // carrega no editor e marca como "idle" (não sujo)
      setNotesDraft(loaded?.notesRich?.state ?? null);
      setSaveStatus('idle');

      // snapshot para evitar re-save do mesmo conteúdo logo de cara
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
  }, [rootHandle, dirTree, selectedCasePath]);

  // Debounce autosave
  useEffect(() => {
    if (state.status !== 'ready') return;
    if (saveStatus !== 'dirty') return;
    if (notesDraft == null) return;
    if (!fileHandleRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      (async () => {
        try {
          setSaveStatus('saving');
          await saveNotesDraftToFile(notesDraft);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      })();
    }, 900);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [notesDraft, saveStatus, state.status]);

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
        notesRich?: {
          state?: unknown;
        };
      }

      const created = parsed.value as Investigation;

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

  // UI (clean)

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
          <div className='dashboard__meta-line'>
            <span className='dashboard__meta-key'>Caso</span>
            <span className='dashboard__meta-value'>{state.caseDirName}</span>
          </div>
          <div className='dashboard__meta-line'>
            <span className='dashboard__meta-key'>Arquivo</span>
            <span className='dashboard__meta-value'>{INVESTIGATION_FILE}</span>
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
      notesRich?: {
        state?: unknown;
      };
    }

    const investigation = state.json as Investigation;
    const initialNotesState = investigation?.notesRich?.state;

    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Investigação</h1>

        <div className='dashboard__meta'>
          <div className='dashboard__meta-line'>
            <span className='dashboard__meta-key'>Caso</span>
            <span className='dashboard__meta-value'>{state.caseDirName}</span>
          </div>
          <div className='dashboard__meta-line'>
            <span className='dashboard__meta-key'>Arquivo</span>
            <span className='dashboard__meta-value'>{INVESTIGATION_FILE}</span>
          </div>
        </div>

        <div className='dashboard__save-status'>
          {saveStatus === 'saving' && 'Salvando…'}
          {saveStatus === 'saved' && 'Salvo'}
          {saveStatus === 'error' && 'Não foi possível salvar'}
          {saveStatus === 'dirty' && 'Não salvo'}
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
