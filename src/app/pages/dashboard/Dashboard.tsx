import './Dashboard.scss';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { DirNode } from '@/utils/read-directory-tree';

const INVESTIGATION_FILE = 'investigacao.json';

type LoadState =
  | { status: 'idle' }
  | { status: 'no-root' }
  | { status: 'no-case-selected' }
  | { status: 'invalid-case-selected' }
  | { status: 'loading' }
  | { status: 'missing-file'; caseDirName: string }
  | { status: 'ready'; caseDirName: string; text: string; json: unknown }
  | { status: 'error'; message: string };

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
  caseDirName: string,
): Promise<FileSystemFileHandle> {
  const fileHandle = await caseDir.getFileHandle(INVESTIGATION_FILE, { create: true });

  const initial = {
    caseId: caseDirName,
    createdAt: new Date().toISOString(),
    notes: '',
    evidences: [],
    tags: [],
  };

  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(initial, null, 2));
  await writable.close();

  return fileHandle;
}

export default function Dashboard() {
  const { rootHandle, dirTree, selectedCasePath } = useWorkspace();

  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

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

      const file = await fileHandle.getFile();
      const text = await file.text();

      if (cancelled) return;

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setState({ status: 'error', message: parsed.error });
        return;
      }

      setState({ status: 'ready', caseDirName: caseNode.name, text, json: parsed.value });
    })().catch((e) => {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Erro inesperado.' });
    });

    return () => {
      cancelled = true;
    };
  }, [rootHandle, dirTree, selectedCasePath]);

  const prettyJson = useMemo(() => {
    if (state.status !== 'ready') return '';
    try {
      return JSON.stringify(state.json, null, 2);
    } catch {
      return state.text;
    }
  }, [state]);

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

      const fileHandle = await createInvestigationFile(caseNode.handle, caseNode.name);
      const file = await fileHandle.getFile();
      const text = await file.text();

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setState({ status: 'error', message: parsed.error });
        return;
      }

      setState({ status: 'ready', caseDirName: caseNode.name, text, json: parsed.value });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Erro inesperado.' });
    }
  }

  // UI
  if (state.status === 'no-root') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Nenhuma pasta importada</h1>
        <p className='dashboard__subtitle'>
          Use o botão Import para escolher a pasta “investigando”.
        </p>
      </div>
    );
  }

  if (state.status === 'no-case-selected') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Nenhum caso selecionado</h1>
        <p className='dashboard__subtitle'>
          Clique em uma pasta de caso (nível principal) na barra lateral.
        </p>
      </div>
    );
  }

  if (state.status === 'invalid-case-selected') {
    return (
      <div className='dashboard dashboard--empty'>
        <h1 className='dashboard__title'>Seleção inválida</h1>
        <p className='dashboard__subtitle'>
          Selecione a pasta principal do caso (filha direta da pasta importada) para abrir a
          investigação.
        </p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Carregando caso…</h1>
        <div className='dashboard__card'>
          <p className='dashboard__subtitle'>Procurando {INVESTIGATION_FILE}…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'missing-file') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Investigação</h1>

        <div className='dashboard__card'>
          <div className='dashboard__row'>
            <span className='dashboard__label'>Caso</span>
            <span className='dashboard__value'>{state.caseDirName}</span>
          </div>

          <p className='dashboard__subtitle'>
            Não foi encontrado o arquivo <strong>{INVESTIGATION_FILE}</strong> dentro desta pasta.
          </p>

          <div className='dashboard__actions'>
            <button
              type='button'
              className='dashboard__case-button'
              onClick={handleCreateInvestigation}
            >
              Criar nova investigação
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Erro</h1>
        <div className='dashboard__card'>
          <p className='dashboard__subtitle'>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className='dashboard'>
        <h1 className='dashboard__title'>Investigação</h1>

        <div className='dashboard__card'>
          <div className='dashboard__row'>
            <span className='dashboard__label'>Caso</span>
            <span className='dashboard__value'>{state.caseDirName}</span>
          </div>
          <div className='dashboard__row'>
            <span className='dashboard__label'>Arquivo</span>
            <span className='dashboard__value'>{INVESTIGATION_FILE}</span>
          </div>
        </div>

        <div className='dashboard__card'>
          <div className='dashboard__row'>
            <span className='dashboard__label'>Conteúdo</span>
          </div>

          <pre className='dashboard__pre'>
            <code>{prettyJson}</code>
          </pre>
        </div>
      </div>
    );
  }

  return <div className='dashboard' />;
}
