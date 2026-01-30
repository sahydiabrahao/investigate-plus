export const INVESTIGATION_FILE = 'investigacao.json';

export const META_ORDER = [
  'DATA',
  'CRIME',
  'COMUNICANTE',
  'VITIMA',
  'TESTEMUNHA',
  'AUTOR',
  'VEICULO',
  'OBJETO',
  'RESUMO',
] as const;

export type MetaKey = (typeof META_ORDER)[number];

export const META_SUGGESTIONS = [...META_ORDER] as const;

export const META_DEFAULTS = ['DATA', 'CRIME', 'VITIMA', 'RESUMO'] as const;

export const META_DATE_KEY: MetaKey = 'DATA';

export const STATUS_SUGGESTIONS = ['PENDENTE', 'CONCLUIDO', 'URGENTE', 'AGUARDANDO'] as const;
