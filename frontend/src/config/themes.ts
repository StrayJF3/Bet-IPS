/** Temas de color disponibles. Los valores estan en src/styles/global.css ([data-theme=...]). */
export const THEMES = [
  { id: 'clasico', name: 'Clásico', a: '#0ea5c6', b: '#f59e0b' },
  { id: 'mono', name: 'Blanco y negro', a: '#fafafa', b: '#a3a3a3' },
  { id: 'cancha', name: 'Cancha', a: '#22c55e', b: '#facc15' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'bet-ips-theme';

export function savedTheme(): ThemeId {
  try {
    const t = localStorage.getItem(KEY);
    if (THEMES.some((x) => x.id === t)) return t as ThemeId;
  } catch {
    // Sin acceso a localStorage (modo privado, bloqueado): se usa el tema por defecto.
  }
  return 'clasico';
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // No se pudo guardar; el tema igual se aplica en esta visita.
  }
}
