import type { Team } from '../../types/domain';
import { Flag } from '../Flag';

interface Props {
  listId: string;
  label: string;
  teams: Team[];
  active: number;
  value: string | null;
  disabledId: string | null;
  showGroups: boolean;
  accent: string;
  onHover: (index: number) => void;
  onPick: (team: Team) => void;
}

/** Lista de opciones del selector, con un titulo por confederacion. */
export function TeamOptions({
  listId,
  label,
  teams,
  active,
  value,
  disabledId,
  showGroups,
  accent,
  onHover,
  onPick,
}: Props) {
  return (
    <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-2">
      {teams.length === 0 && (
        <li className="px-3 py-6 text-center text-sm text-slate-500">Ese país no juega el Mundial 2026</li>
      )}
      {teams.map((t, i) => {
        const startsGroup = showGroups && t.confederation !== teams[i - 1]?.confederation;
        const disabled = t.id === disabledId;
        return (
          <li key={t.id} role="presentation">
            {startsGroup && (
              <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
                {t.confederation}
              </div>
            )}
            <div
              id={`${listId}-${i}`}
              role="option"
              aria-selected={t.id === value}
              aria-disabled={disabled}
              onPointerEnter={() => onHover(i)}
              onClick={() => onPick(t)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                disabled ? 'cursor-not-allowed opacity-30' : i === active ? 'bg-white/10 text-white' : 'text-slate-300'
              }`}
            >
              <Flag code={t.flag} className="h-4 w-6" />
              <span className="flex-1">{t.name}</span>
              {t.id === value && <span className={`text-xs ${accent}`}>●</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
