export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits)}%`;

export const int = (n: number) => new Intl.NumberFormat('es-CO').format(n);

export const date = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  );

export const MAX_QUERY_LENGTH = 40;

/** Quita tildes y pasa a minusculas para buscar "espana" y encontrar "España". */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
