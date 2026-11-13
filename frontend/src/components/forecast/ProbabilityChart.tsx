import { useEffect, useState } from 'react';
import type { Prediction, Team } from '../../types/domain';
import { pct } from '../../utils/format';
import { Flag } from '../Flag';

interface Props {
  teamA: Team;
  teamB: Team;
  prediction: Prediction;
  loading: boolean;
}

/**
 * Diagrama de barras gana / empata / pierde.
 * Cada barra lleva su etiqueta y su porcentaje en texto (el color nunca es la unica pista)
 * y hay una tabla equivalente para lectores de pantalla.
 */
interface Bar {
  key: 'win' | 'draw' | 'loss';
  label: string;
  short: string;
  value: number;
  color: string;
  flag: string | null;
}

/** Etiquetas debajo de cada barra: color, bandera y nombre. */
function BarLabels({ bars }: { bars: Bar[] }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1 sm:gap-6 lg:gap-10">
      {bars.map((b) => (
        <div key={b.key} className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${b.color}`} aria-hidden="true" />
            {b.flag && <Flag code={b.flag} className="h-3 w-4" />}
          </span>
          <span className="break-words text-xs leading-tight text-slate-300 sm:text-sm lg:text-base">
            {b.key === 'draw' ? (
              'Empate'
            ) : (
              <>
                Gana
                <br className="sm:hidden" /> {b.short}
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Altura maxima de una barra (100 %) respecto al grafico; deja espacio para el porcentaje. */
const BAR_MAX_HEIGHT = 0.8;

export function ProbabilityChart({ teamA, teamB, prediction, loading }: Props) {
  const { win, draw, loss } = prediction.probabilities;
  const bars: Bar[] = [
    { key: 'win', label: `Gana ${teamA.name}`, short: teamA.name, value: win, color: 'bg-teamA', flag: teamA.flag },
    { key: 'draw', label: 'Empate', short: 'Empate', value: draw, color: 'bg-draw', flag: null },
    { key: 'loss', label: `Gana ${teamB.name}`, short: teamB.name, value: loss, color: 'bg-teamB', flag: teamB.flag },
  ];
  const max = Math.max(win, draw, loss);
  const favorite = bars.find((b) => b.value === max)!;

  // Arranca en 0 y crece, para que las barras "se llenen" al llegar cada pronostico.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, [prediction]);

  const [hover, setHover] = useState<string | null>(null);

  return (
    <figure className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`} aria-busy={loading}>
      <figcaption className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-slate-400">Probabilidad según el modelo</span>
        <span className="text-sm text-slate-300">
          Favorito:{' '}
          <strong className="font-semibold text-white">{favorite.key === 'draw' ? 'Empate' : favorite.short}</strong>
        </span>
      </figcaption>

      <div className="relative grid h-56 grid-cols-3 items-end gap-1 border-b border-white/15 sm:h-72 sm:gap-6 lg:h-80 lg:gap-10">
        {[0.25, 0.5, 0.75].map((g) => (
          <div
            key={g}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/5"
            style={{ bottom: `${g * 100}%` }}
          />
        ))}
        {bars.map((b, i) => (
          <div
            key={b.key}
            className="relative flex h-full cursor-default flex-col items-center justify-end px-1 sm:px-4"
            onPointerEnter={() => setHover(b.key)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="mb-2 text-xl font-bold tabular-nums text-white sm:text-3xl lg:text-4xl">
              {pct(b.value)}
            </span>
            <div
              className={`w-full max-w-[160px] rounded-t-md ${b.color} transition-[height,filter] duration-700 ease-out ${
                hover && hover !== b.key ? 'brightness-50' : ''
              }`}
              style={{ height: grown ? `${Math.max(b.value * 100 * BAR_MAX_HEIGHT, 1)}%` : '0%' }}
            />
            {hover === b.key && (
              <div
                role="tooltip"
                className={`absolute top-0 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg sm:block ${i === 0 ? 'left-0' : i === 2 ? 'right-0' : ''} border border-white/10 bg-ink-800 px-3 py-2 text-xs text-slate-200 shadow-xl`}
              >
                {b.label}: <strong className="text-white">{pct(b.value, 1)}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      <BarLabels bars={bars} />
      <table className="sr-only">
        <caption>
          Probabilidades del partido {teamA.name} contra {teamB.name}
        </caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.label}</th>
              <td>{pct(b.value, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
