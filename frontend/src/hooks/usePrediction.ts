import { useCallback, useEffect, useState } from 'react';
import { forecastService } from '../services/forecastService';
import type { Prediction } from '../types/domain';

export type PredictionState =
  | { status: 'idle' }
  | { status: 'loading'; previous?: Prediction }
  | { status: 'success'; data: Prediction }
  | { status: 'error'; error: Error };

/** Pide el pronostico al modelo cada vez que cambian las dos selecciones. */
export function usePrediction(teamA: string | null, teamB: string | null) {
  const [state, setState] = useState<PredictionState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!teamA || !teamB || teamA === teamB) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ status: 'loading', previous: s.status === 'success' ? s.data : undefined }));
    forecastService
      .predict(teamA, teamB, controller.signal)
      .then((data) => !controller.signal.aborted && setState({ status: 'success', data }))
      .catch((error: Error) => !controller.signal.aborted && setState({ status: 'error', error }));
    return () => controller.abort();
  }, [teamA, teamB, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
