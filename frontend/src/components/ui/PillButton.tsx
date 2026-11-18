import type { ButtonHTMLAttributes } from 'react';

/** Boton redondeado secundario que se usa en toda la pagina (reintentar, sorprender, recargar). */
export function PillButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-full border border-white/15 px-5 py-2 text-sm text-slate-200 transition hover:bg-white/10 ${className}`}
      {...props}
    />
  );
}
