import type { SlashCommandsStore } from '@/types/slash-commands.types';
import {
  clearAtalhosPreferenciasGlobais,
  loadAtalhosPreferenciasGlobais,
  saveAtalhosPreferenciasGlobais,
} from '@/storage/preferencias-globais.storage';

export async function loadSlashCommands(): Promise<SlashCommandsStore> {
  return loadAtalhosPreferenciasGlobais();
}

export async function saveSlashCommands(store: SlashCommandsStore): Promise<void> {
  await saveAtalhosPreferenciasGlobais(store);
}

export async function clearSlashCommands(): Promise<void> {
  await clearAtalhosPreferenciasGlobais();
}
