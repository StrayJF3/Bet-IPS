import type { Team } from '../../types/domain';

const RESULT_COLOR = { V: 'bg-emerald-400/80', E: 'bg-slate-400/70', D: 'bg-rose-400/80' } as const;
const RESULT_NAME = { V: 'Victoria', E: 'Empate', D: 'Derrota' } as const;

interface Props {
  team: Team;
  side: 'a' | 'b';
}

/** Ranking FIFA y ultimos resultados de una seleccion (los mismos datos que usa el modelo). */
export function TeamStats({ team, side }: Props) {
  return (
    <div
      className={`mt-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-400 ${side === 'b' ? 'lg:flex-row-reverse' : ''}`}
    >
      <span>
        Ranking FIFA <strong className="font-semibold tabular-nums text-slate-200">#{team.fifa_rank}</strong>
      </span>
      <span className="flex items-center gap-1" aria-label={`Últimos partidos: ${team.form.join(', ')}`}>
        {team.form.map((result, i) => (
          <span
            key={i}
            title={RESULT_NAME[result]}
            className={`grid h-4 w-4 place-items-center rounded-[3px] text-[9px] font-bold text-ink-950 ${RESULT_COLOR[result]}`}
          >
            {result}
          </span>
        ))}
      </span>
    </div>
  );
}
