import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error };

/** Ejecuta una carga asincrona cancelable y expone loading / success / error + reintentar. */
/** `load` se ejecuta al montar el componente y en cada reintento. */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal)
      .then((data) => !controller.signal.aborted && setState({ status: 'success', data }))
      .catch((error: Error) => !controller.signal.aborted && setState({ status: 'error', error }));
    return () => controller.abort();
    // Solo se recarga al reintentar: `load` es una funcion nueva en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
