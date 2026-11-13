import { BallNetwork } from './background/BallNetwork';

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate flex overflow-hidden min-h-[calc(100svh-5rem)] lg:min-h-[calc(100svh-6rem)] items-center px-4 sm:px-6"
    >
      <BallNetwork />
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex animate-rise items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-teamA" /> Mundial 2026 · 48 selecciones
        </p>
        <h1 className="mt-6 animate-rise text-4xl font-extrabold leading-[1.05] tracking-tight text-white [animation-delay:.08s] sm:text-6xl">
          El partido, visto por el{' '}
          <span className="bg-gradient-to-r from-teamA to-slate-200 bg-clip-text text-transparent">
            aprendizaje automático
          </span>
        </h1>
        <div className="mt-10 flex animate-rise flex-col items-center justify-center gap-3 [animation-delay:.24s] sm:flex-row">
          <a
            href="#pronostico"
            className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-ink-950 transition hover:scale-[1.03]"
          >
            Hacer un pronóstico
          </a>
          <a
            href="#modelo"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Cómo funciona
          </a>
        </div>
        <p className="mt-14 text-xs text-slate-500">Pasa el cursor sobre los balones o tócalos para patearlos.</p>
      </div>
    </section>
  );
}
