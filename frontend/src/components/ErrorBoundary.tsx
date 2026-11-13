import { Component, type ReactNode } from 'react';
import { PillButton } from './ui/PillButton';

/** Si algo falla al renderizar, muestra un mensaje generico en vez de la traza. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-slate-300">
        <div>
          <p className="text-lg font-semibold text-white">Algo salió mal.</p>
          <PillButton onClick={() => location.reload()} className="mt-4">
            Recargar
          </PillButton>
        </div>
      </div>
    );
  }
}
