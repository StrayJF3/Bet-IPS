import type { PredictionState } from '../../hooks/usePrediction';
import type { Prediction, Team } from '../../types/domain';
import { PillButton } from '../ui/PillButton';
import { RetryMessage } from '../ui/RetryMessage';
import { ProbabilityChart } from './ProbabilityChart';

interface Props {
  state: PredictionState;
  teams: Team[];
  onRetry: () => void;
  onRandomize: () => void;
}

function venueNote(venue: Prediction['venue'], a: Team, b: Team) {
  if (venue === 'local') return `${a.name} juega de local (anfitrión)`;
  if (venue === 'visitante') return `${b.name} juega de local (anfitrión)`;
  return 'Campo neutral';
}

/** Parte inferior del panel: invitacion a elegir, cargando, error o el diagrama de barras. */
export function ForecastResult({ state, teams, onRetry, onRandomize }: Props) {
  if (state.status === 'idle') {
    return (
      <div className="py-10 text-center">
        <p className="text-slate-400">Selecciona los dos equipos para ver el pronóstico.</p>
        <PillButton onClick={onRandomize} className="mt-4">
          Sorpréndeme con un partido
        </PillButton>
      </div>
    );
  }
  if (state.status === 'error') return <RetryMessage message={state.error.message} onRetry={onRetry} />;

  // Mientras llega un pronostico nuevo se sigue mostrando el anterior, atenuado.
  const shown = state.status === 'success' ? state.data : state.previous;
  // Las etiquetas salen de la prediccion mostrada, asi nunca se mezclan con equipos recien elegidos.
  const a = shown && teams.find((t) => t.id === shown.team_a);
  const b = shown && teams.find((t) => t.id === shown.team_b);
  if (!shown || !a || !b) return <p className="py-16 text-center text-slate-400">El modelo está calculando…</p>;

  return (
    <>
      <ProbabilityChart teamA={a} teamB={b} prediction={shown} loading={state.status === 'loading'} />
      <p className="mt-6 text-center text-xs text-slate-500">{venueNote(shown.venue, a, b)}</p>
    </>
  );
}
