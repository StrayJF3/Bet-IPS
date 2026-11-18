import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}

/** Encabezado centrado de cada seccion: etiqueta pequena, titulo y descripcion opcional. */
export function SectionHeader({ eyebrow, title, children }: Props) {
  return (
    <header className="mb-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[.3em] text-teamA">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-xl text-slate-400">{children}</p>}
    </header>
  );
}
