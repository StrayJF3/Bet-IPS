/**
 * Bandera servida desde el propio sitio (paquete flag-icons): sin CDNs de terceros.
 * Solo se empaquetan las banderas de las 48 selecciones del Mundial 2026 (mismos codigos
 * que backend/app/teams.py). Si se agrega una seleccion, hay que agregar su codigo aqui.
 */
const FLAGS = import.meta.glob(
  '../../node_modules/flag-icons/flags/4x3/{ca,mx,us,cw,ht,pa,ar,br,co,ec,py,uy,de,at,be,ba,cz,hr,gb-sct,es,fr,gb-eng,no,nl,pt,se,ch,tr,dz,cv,ci,eg,gh,ma,cd,sn,za,tn,sa,au,qa,kr,iq,ir,jp,jo,uz,nz}.svg',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>;

const byCode: Record<string, string> = {};
for (const [path, url] of Object.entries(FLAGS)) {
  byCode[path.split('/').pop()!.replace('.svg', '')] = url;
}

interface Props {
  code: string;
  className?: string;
}

export function Flag({ code, className = 'h-4 w-6' }: Props) {
  const src = byCode[code];
  if (!src) return <span className={`${className} inline-block rounded-sm bg-ink-700`} aria-hidden="true" />;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`${className} rounded-sm object-cover shadow ring-1 ring-white/10`}
    />
  );
}
