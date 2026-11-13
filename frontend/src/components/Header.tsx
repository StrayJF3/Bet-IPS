import { useState } from 'react';
import { z } from 'zod';
import { THEMES, applyTheme, savedTheme, type ThemeId } from '../config/themes';
import { useAsync } from '../hooks/useAsync';
import { request } from '../services/apiClient';

const healthSchema = z.object({ status: z.literal('ok'), model_version: z.string().max(40) });

/** Botones de color para cambiar el tema de la pagina. */
function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(savedTheme);
  const choose = (id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  };

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Colores de la página">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          title={t.name}
          aria-label={t.name}
          onClick={() => choose(t.id)}
          className={`h-6 w-6 rounded-full border-2 transition sm:h-7 sm:w-7 ${theme === t.id ? 'border-white' : 'border-white/15 hover:border-white/50'}`}
          style={{ background: `linear-gradient(135deg, ${t.a} 50%, ${t.b} 50%)` }}
        />
      ))}
    </div>
  );
}

/** Barra superior con el estado en vivo de la API del modelo y el selector de colores. */
export function Header() {
  const health = useAsync((signal) => request('/api/health', healthSchema, { signal, timeoutMs: 5000 }));
  const online = health.status === 'success';
  const label = online ? 'Modelo en línea' : health.status === 'loading' ? 'Conectando…' : 'Sin conexión';
  const dot = online ? 'bg-emerald-400' : health.status === 'loading' ? 'bg-slate-500' : 'bg-rose-500';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/75 backdrop-blur-md">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-24 lg:px-8">
        <a
          href="#inicio"
          className="flex shrink-0 items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          <img src="/favicon.svg" alt="" className="h-9 w-9 lg:h-10 lg:w-10" />
          Bet-IPS
        </a>
        <div className="flex items-center gap-4 text-base font-medium text-slate-300 sm:gap-8 lg:text-lg">
          <a href="#pronostico" className="hidden transition hover:text-white sm:inline">
            Pronóstico
          </a>
          <a href="#modelo" className="hidden transition hover:text-white md:inline">
            El modelo
          </a>
          <a href="#equipo" className="transition hover:text-white">
            Equipo
          </a>
          <span className="flex items-center gap-2 text-sm lg:text-base" title={label}>
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <span className="hidden lg:inline">{label}</span>
          </span>
          <ThemePicker />
        </div>
      </nav>
    </header>
  );
}
