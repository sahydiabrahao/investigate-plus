import { loadDirectoryHandle } from '@/storage';
import {
  PREFERENCIAS_GLOBAIS_FILE,
  PREFERENCIAS_GLOBAIS_FILE_ANTIGO,
} from '@/constants/preferencias-globais.constants';
import type { SlashCommand, SlashCommandsStore } from '@/types/slash-commands.types';
import {
  SLASH_COMMANDS_SCHEMA_VERSION,
  createEmptySlashCommandsStore,
} from '@/types/slash-commands.types';
import type { TagDefinition } from '@/types/tag.types';
import type { TagsStore } from '@/types/tags-store.types';
import { TAGS_SCHEMA_VERSION, createEmptyTagsStore } from '@/types/tags-store.types';

const PASTA_CONFIG_LEGADA = '.investigate-plus';
const ARQUIVO_PREFERENCIAS_LEGADO = 'preferencias-globais.json';

const CHAVE_TAGS_LEGADO = 'investigate_plus_tags_v1';
const CHAVE_ATALHOS_LEGADO = 'investigate_plus_slash_commands_v1';

const VERSAO_SCHEMA_PREFERENCIAS = 1 as const;

type PreferenciasGlobais = {
  schemaVersion: typeof VERSAO_SCHEMA_PREFERENCIAS;
  tags: {
    schemaVersion: typeof TAGS_SCHEMA_VERSION;
    itensPorId: Record<string, TagDefinition>;
  };
  atalhos: {
    schemaVersion: typeof SLASH_COMMANDS_SCHEMA_VERSION;
    itensPorId: Record<string, SlashCommand>;
  };
  updatedAt: string;
};

function agoraIso(): string {
  return new Date().toISOString();
}

function criarPreferenciasVazias(): PreferenciasGlobais {
  return {
    schemaVersion: VERSAO_SCHEMA_PREFERENCIAS,
    tags: {
      schemaVersion: TAGS_SCHEMA_VERSION,
      itensPorId: {},
    },
    atalhos: {
      schemaVersion: SLASH_COMMANDS_SCHEMA_VERSION,
      itensPorId: {},
    },
    updatedAt: agoraIso(),
  };
}

function podeUsarLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const k = '__test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function getChromeStorageLocal(): typeof chrome.storage.local | null {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizarTag(raw: unknown): TagDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as { id?: unknown; label?: unknown; styleId?: unknown };

  if (typeof x.label !== 'string' || x.label.trim().length === 0) return null;
  if (typeof x.styleId !== 'number' || x.styleId < 1 || x.styleId > 5) return null;

  const id = typeof x.id === 'string' && x.id.trim().length > 0 ? x.id.trim() : makeId();

  return {
    id,
    label: x.label.trim(),
    styleId: x.styleId as 1 | 2 | 3 | 4 | 5,
  };
}

function normalizarAtalho(raw: unknown): SlashCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as {
    id?: unknown;
    trigger?: unknown;
    template?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (typeof x.trigger !== 'string' || x.trigger.trim().length === 0) return null;
  if (typeof x.template !== 'string') return null;

  const id = typeof x.id === 'string' && x.id.trim().length > 0 ? x.id.trim() : makeId();
  const agora = agoraIso();

  return {
    id,
    trigger: x.trigger.trim(),
    template: x.template,
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : agora,
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : agora,
  };
}

function tagsStoreParaMapa(store: TagsStore): Record<string, TagDefinition> {
  const out: Record<string, TagDefinition> = {};
  for (const item of store.items) {
    const tag = normalizarTag(item);
    if (!tag) continue;
    out[tag.id] = tag;
  }
  return out;
}

function atalhosStoreParaMapa(store: SlashCommandsStore): Record<string, SlashCommand> {
  const out: Record<string, SlashCommand> = {};
  for (const item of store.items) {
    const atalho = normalizarAtalho(item);
    if (!atalho) continue;
    out[atalho.id] = atalho;
  }
  return out;
}

function mapaParaTagsStore(mapa: Record<string, TagDefinition>): TagsStore {
  const items: TagDefinition[] = [];
  for (const key of Object.keys(mapa)) {
    const tag = normalizarTag(mapa[key]);
    if (!tag) continue;
    items.push(tag);
  }
  return {
    schemaVersion: TAGS_SCHEMA_VERSION,
    items,
  };
}

function mapaParaAtalhosStore(mapa: Record<string, SlashCommand>): SlashCommandsStore {
  const items: SlashCommand[] = [];
  for (const key of Object.keys(mapa)) {
    const atalho = normalizarAtalho(mapa[key]);
    if (!atalho) continue;
    items.push(atalho);
  }
  return {
    schemaVersion: SLASH_COMMANDS_SCHEMA_VERSION,
    items,
  };
}

function normalizarPreferencias(raw: unknown): PreferenciasGlobais | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as {
    schemaVersion?: unknown;
    tags?: unknown;
    atalhos?: unknown;
    updatedAt?: unknown;
  };

  if (obj.schemaVersion !== VERSAO_SCHEMA_PREFERENCIAS) return null;

  const prefs = criarPreferenciasVazias();

  const tagsObj = obj.tags as { itensPorId?: unknown; items?: unknown } | undefined;
  const atalhosObj = obj.atalhos as { itensPorId?: unknown; items?: unknown } | undefined;

  if (tagsObj?.itensPorId && typeof tagsObj.itensPorId === 'object') {
    const itens = tagsObj.itensPorId as Record<string, unknown>;
    for (const key of Object.keys(itens)) {
      const tag = normalizarTag(itens[key]);
      if (!tag) continue;
      prefs.tags.itensPorId[tag.id] = tag;
    }
  } else if (Array.isArray(tagsObj?.items)) {
    for (const rawTag of tagsObj.items) {
      const tag = normalizarTag(rawTag);
      if (!tag) continue;
      prefs.tags.itensPorId[tag.id] = tag;
    }
  }

  if (atalhosObj?.itensPorId && typeof atalhosObj.itensPorId === 'object') {
    const itens = atalhosObj.itensPorId as Record<string, unknown>;
    for (const key of Object.keys(itens)) {
      const atalho = normalizarAtalho(itens[key]);
      if (!atalho) continue;
      prefs.atalhos.itensPorId[atalho.id] = atalho;
    }
  } else if (Array.isArray(atalhosObj?.items)) {
    for (const rawAtalho of atalhosObj.items) {
      const atalho = normalizarAtalho(rawAtalho);
      if (!atalho) continue;
      prefs.atalhos.itensPorId[atalho.id] = atalho;
    }
  }

  if (typeof obj.updatedAt === 'string') {
    prefs.updatedAt = obj.updatedAt;
  }

  return prefs;
}

function normalizarTagsLegadas(raw: unknown): TagsStore {
  if (!raw || typeof raw !== 'object') return createEmptyTagsStore();
  const obj = raw as { schemaVersion?: unknown; items?: unknown };
  if (obj.schemaVersion !== TAGS_SCHEMA_VERSION) return createEmptyTagsStore();
  if (!Array.isArray(obj.items)) return createEmptyTagsStore();

  const items: TagDefinition[] = [];
  for (const rawTag of obj.items) {
    const tag = normalizarTag(rawTag);
    if (!tag) continue;
    items.push(tag);
  }

  return {
    schemaVersion: TAGS_SCHEMA_VERSION,
    items,
  };
}

function normalizarAtalhosLegados(raw: unknown): SlashCommandsStore {
  if (!raw || typeof raw !== 'object') return createEmptySlashCommandsStore();
  const obj = raw as { schemaVersion?: unknown; items?: unknown };
  if (obj.schemaVersion !== SLASH_COMMANDS_SCHEMA_VERSION) return createEmptySlashCommandsStore();
  if (!Array.isArray(obj.items)) return createEmptySlashCommandsStore();

  const items: SlashCommand[] = [];
  for (const rawAtalho of obj.items) {
    const atalho = normalizarAtalho(rawAtalho);
    if (!atalho) continue;
    items.push(atalho);
  }

  return {
    schemaVersion: SLASH_COMMANDS_SCHEMA_VERSION,
    items,
  };
}

async function lerLegadoPorChave(chave: string): Promise<unknown> {
  const storage = getChromeStorageLocal();
  if (storage) {
    return new Promise((resolve) => {
      storage.get([chave], (result) => resolve(result?.[chave]));
    });
  }

  if (podeUsarLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function salvarLegadoPorChave(chave: string, valor: unknown): Promise<void> {
  const storage = getChromeStorageLocal();
  if (storage) {
    await new Promise<void>((resolve) => {
      storage.set({ [chave]: valor }, () => resolve());
    });
    return;
  }

  if (!podeUsarLocalStorage()) return;

  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // ignore
  }
}

async function limparLegado(): Promise<void> {
  const storage = getChromeStorageLocal();
  if (storage) {
    await new Promise<void>((resolve) => {
      storage.remove([CHAVE_TAGS_LEGADO, CHAVE_ATALHOS_LEGADO], () => resolve());
    });
    return;
  }

  if (!podeUsarLocalStorage()) return;

  try {
    window.localStorage.removeItem(CHAVE_TAGS_LEGADO);
    window.localStorage.removeItem(CHAVE_ATALHOS_LEGADO);
  } catch {
    // ignore
  }
}

async function carregarLegadoStorage(): Promise<PreferenciasGlobais> {
  const rawTags = await lerLegadoPorChave(CHAVE_TAGS_LEGADO);
  const rawAtalhos = await lerLegadoPorChave(CHAVE_ATALHOS_LEGADO);

  const tags = normalizarTagsLegadas(rawTags);
  const atalhos = normalizarAtalhosLegados(rawAtalhos);

  const prefs = criarPreferenciasVazias();
  prefs.tags.itensPorId = tagsStoreParaMapa(tags);
  prefs.atalhos.itensPorId = atalhosStoreParaMapa(atalhos);
  prefs.updatedAt = agoraIso();

  return prefs;
}

async function salvarTagsLegado(store: TagsStore): Promise<void> {
  await salvarLegadoPorChave(CHAVE_TAGS_LEGADO, {
    schemaVersion: TAGS_SCHEMA_VERSION,
    items: store.items,
  });
}

async function salvarAtalhosLegado(store: SlashCommandsStore): Promise<void> {
  await salvarLegadoPorChave(CHAVE_ATALHOS_LEGADO, {
    schemaVersion: SLASH_COMMANDS_SCHEMA_VERSION,
    items: store.items,
  });
}

async function getArquivoPreferenciasAtual(criar: boolean): Promise<FileSystemFileHandle | null> {
  const root = await loadDirectoryHandle();
  if (!root) return null;

  try {
    return await root.getFileHandle(PREFERENCIAS_GLOBAIS_FILE, { create: criar });
  } catch {
    return null;
  }
}

async function getArquivoPreferenciasAntigoRaiz(): Promise<FileSystemFileHandle | null> {
  const root = await loadDirectoryHandle();
  if (!root) return null;

  try {
    return await root.getFileHandle(PREFERENCIAS_GLOBAIS_FILE_ANTIGO);
  } catch {
    return null;
  }
}

async function getArquivoPreferenciasLegado(): Promise<FileSystemFileHandle | null> {
  const root = await loadDirectoryHandle();
  if (!root) return null;

  try {
    const dir = await root.getDirectoryHandle(PASTA_CONFIG_LEGADA);
    return await dir.getFileHandle(ARQUIVO_PREFERENCIAS_LEGADO);
  } catch {
    return null;
  }
}

async function lerPreferenciasPorHandle(
  fileHandle: FileSystemFileHandle | null,
): Promise<PreferenciasGlobais | null> {
  if (!fileHandle) return null;

  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;

    const parsed: unknown = JSON.parse(text);
    return normalizarPreferencias(parsed);
  } catch {
    return null;
  }
}

async function lerPreferenciasArquivoAtual(): Promise<PreferenciasGlobais | null> {
  const fileHandle = await getArquivoPreferenciasAtual(false);
  return lerPreferenciasPorHandle(fileHandle);
}

async function lerPreferenciasArquivoLegado(): Promise<PreferenciasGlobais | null> {
  const antigoRaiz = await getArquivoPreferenciasAntigoRaiz();
  const antigoRaizData = await lerPreferenciasPorHandle(antigoRaiz);
  if (antigoRaizData) return antigoRaizData;

  const fileHandle = await getArquivoPreferenciasLegado();
  return lerPreferenciasPorHandle(fileHandle);
}

async function salvarPreferenciasArquivo(preferencias: PreferenciasGlobais): Promise<boolean> {
  const fileHandle = await getArquivoPreferenciasAtual(true);
  if (!fileHandle) return false;

  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(preferencias, null, 2));
  await writable.close();
  return true;
}

async function carregarPreferenciasComMigracao(): Promise<PreferenciasGlobais> {
  const atual = await lerPreferenciasArquivoAtual();
  if (atual) return atual;

  const arquivoLegado = await lerPreferenciasArquivoLegado();
  if (arquivoLegado) {
    await salvarPreferenciasArquivo(arquivoLegado);
    return arquivoLegado;
  }

  const legadoStorage = await carregarLegadoStorage();

  const temDados =
    Object.keys(legadoStorage.tags.itensPorId).length > 0 ||
    Object.keys(legadoStorage.atalhos.itensPorId).length > 0;

  if (temDados) {
    const gravou = await salvarPreferenciasArquivo(legadoStorage);
    if (gravou) {
      await limparLegado();
    }
    return legadoStorage;
  }

  return criarPreferenciasVazias();
}

export async function loadTagsPreferenciasGlobais(): Promise<TagsStore> {
  const prefs = await carregarPreferenciasComMigracao();
  return mapaParaTagsStore(prefs.tags.itensPorId);
}

export async function saveTagsPreferenciasGlobais(store: TagsStore): Promise<void> {
  const prefs = await carregarPreferenciasComMigracao();
  prefs.tags.itensPorId = tagsStoreParaMapa(store);
  prefs.updatedAt = agoraIso();

  const gravou = await salvarPreferenciasArquivo(prefs);
  if (!gravou) {
    await salvarTagsLegado(store);
  }
}

export async function clearTagsPreferenciasGlobais(): Promise<void> {
  const vazio = createEmptyTagsStore();
  await saveTagsPreferenciasGlobais(vazio);
}

export async function loadAtalhosPreferenciasGlobais(): Promise<SlashCommandsStore> {
  const prefs = await carregarPreferenciasComMigracao();
  return mapaParaAtalhosStore(prefs.atalhos.itensPorId);
}

export async function saveAtalhosPreferenciasGlobais(store: SlashCommandsStore): Promise<void> {
  const prefs = await carregarPreferenciasComMigracao();
  prefs.atalhos.itensPorId = atalhosStoreParaMapa(store);
  prefs.updatedAt = agoraIso();

  const gravou = await salvarPreferenciasArquivo(prefs);
  if (!gravou) {
    await salvarAtalhosLegado(store);
  }
}

export async function clearAtalhosPreferenciasGlobais(): Promise<void> {
  const vazio = createEmptySlashCommandsStore();
  await saveAtalhosPreferenciasGlobais(vazio);
}

