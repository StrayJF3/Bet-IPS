interface Props {
  onSwap: () => void;
  canSwap: boolean;
}

/** Insignia "VS" entre los dos selectores, con el boton para intercambiar equipos. */
export function VsBadge({ onSwap, canSwap }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 lg:flex-col lg:pt-8">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-ink-800 text-base font-black tracking-wider text-white lg:h-20 lg:w-20 lg:text-xl">
        VS
      </span>
      <button
        type="button"
        onClick={onSwap}
        disabled={!canSwap}
        title="Intercambiar equipos"
        aria-label="Intercambiar equipos"
        className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/30 hover:text-white disabled:opacity-30"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path
            d="M4 7h11l-3-3M16 13H5l3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
