export const INVESTIGATION_FILE = 'investigacao.json';

export const META_SUGGESTIONS = [
  'DATA',
  'CRIME',
  'STATUS',
  'COMUNICANTE',
  'VITIMA',
  'TESTEMUNHA',
  'AUTOR',
  'VEICULO',
  'OBJETO',
  'RESUMO',
] as const;

export const META_DEFAULTS = ['DATA', 'CRIME', 'STATUS', 'VITIMA', 'RESUMO'] as const;

export const META_DATE_KEY = 'DATA';

export const STATUS_SUGGESTIONS = ['PENDENTE', 'CONCLUIDO', 'URGENTE', 'AGUARDANDO'] as const;
