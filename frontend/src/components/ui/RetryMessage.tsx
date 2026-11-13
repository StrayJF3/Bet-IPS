import { PillButton } from './PillButton';

interface Props {
  message: string;
  onRetry: () => void;
}

/** Mensaje de error con boton para reintentar la carga. */
export function RetryMessage({ message, onRetry }: Props) {
  return (
    <div className="py-12 text-center">
      <p className="text-slate-300">{message}</p>
      <PillButton onClick={onRetry} className="mt-4">
        Reintentar
      </PillButton>
    </div>
  );
}
