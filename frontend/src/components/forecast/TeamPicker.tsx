import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useListNavigation } from '../../hooks/useListNavigation';
import type { Team } from '../../types/domain';
import { MAX_QUERY_LENGTH, normalize } from '../../utils/format';
import { Flag } from '../Flag';
import { TeamOptions } from './TeamOptions';

interface Props {
  label: string;
  side: 'a' | 'b';
  teams: Team[];
  value: string | null;
  disabledId: string | null;
  onChange: (id: string) => void;
}

const CONF_ORDER = ['CONMEBOL', 'UEFA', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const;

const byConfederationAndName = (x: Team, y: Team) =>
  CONF_ORDER.indexOf(x.confederation) - CONF_ORDER.indexOf(y.confederation) || x.name.localeCompare(y.name, 'es');

function SelectedTeam({ team }: { team: Team | null }) {
  if (!team) {
    return (
      <>
        <span className="grid h-8 w-11 shrink-0 place-items-center rounded-md border border-dashed border-white/20 text-slate-500 lg:h-11 lg:w-14">
          ?
        </span>
        <span className="flex-1 text-slate-400">Elige una selección</span>
      </>
    );
  }
  return (
    <>
      <Flag code={team.flag} className="h-8 w-11 shrink-0 lg:h-11 lg:w-14" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{team.name}</span>
        <span className="block text-xs text-slate-400">
          {team.confederation}
          {team.host ? ' · Anfitrión' : ''}
        </span>
      </span>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-5 w-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M5 7.5l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Selector con busqueda de las 48 selecciones, agrupadas por confederacion. Accesible con teclado. */
export function TeamPicker({ label, side, teams, value, disabledId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = teams.find((t) => t.id === value) ?? null;
  const accent = side === 'a' ? 'text-teamA' : 'text-teamB';
  const ring = side === 'a' ? 'focus-visible:ring-teamA/60' : 'focus-visible:ring-teamB/60';

  const filtered = useMemo(() => {
    const q = normalize(query);
    return teams.filter((t) => !q || normalize(t.name).includes(q)).sort(byConfederationAndName);
  }, [teams, query]);

  const pick = (t: Team) => {
    if (t.id === disabledId) return;
    onChange(t.id);
    setOpen(false);
    setQuery('');
  };
  const { active, setActive, onKeyDown } = useListNavigation(filtered, listId, pick, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnOutsideClick = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <span className={`mb-2 block text-xs font-semibold uppercase tracking-[.2em] ${accent}`}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-3 text-left backdrop-blur transition hover:border-white/25 focus:outline-none focus-visible:ring-2 sm:px-4 sm:py-4 lg:px-5 lg:py-5 ${ring}`}
      >
        <SelectedTeam team={selected} />
        <Chevron open={open} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 animate-rise overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="border-b border-white/10 p-3">
            <input
              ref={inputRef}
              value={query}
              maxLength={MAX_QUERY_LENGTH}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar país…"
              role="combobox"
              aria-controls={listId}
              aria-expanded="true"
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              className="w-full rounded-xl bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <TeamOptions
            listId={listId}
            label={label}
            teams={filtered}
            active={active}
            value={value}
            disabledId={disabledId}
            showGroups={!query}
            accent={accent}
            onHover={setActive}
            onPick={pick}
          />
        </div>
      )}
    </div>
  );
}
