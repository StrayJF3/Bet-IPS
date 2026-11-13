import teamPhoto from '../../assets/equipo-bet-ips.jpg';
import { useInView } from '../../hooks/useInView';
import { SectionHeader } from '../ui/SectionHeader';
import { TiltPhoto } from './TiltPhoto';

/** Roles segun el README del repositorio Bet-IPS. */
const MEMBERS = [
  { name: 'Anderson Granda', role: 'Product Owner & QA' },
  { name: 'Isaac Bonilla', role: 'Scrum Master' },
  { name: 'Juan Fernández', role: 'Dev Team & Production' },
] as const;

const STAGGER_MS = 150;
const PHOTO_DELAY_MS = 200;

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('');

/** Seccion "Equipo": foto del equipo con animaciones al hacer scroll y tarjetas de cada integrante. */
export function TeamSection() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="equipo" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:scroll-mt-32 lg:px-8">
      <div ref={ref} className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Equipo Bet-IPS" title="Quiénes lo hicimos">
          Proyecto Integrador de 6.º semestre · Ingeniería en Sistemas de Información · UIDE
        </SectionHeader>

        <TiltPhoto
          src={teamPhoto}
          alt="El equipo Bet-IPS: Anderson Granda, Isaac Bonilla y Juan Fernández"
          visible={inView}
        />

        <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:mt-10 lg:gap-6">
          {MEMBERS.map((m, i) => (
            <li
              key={m.name}
              className={`transition duration-500 ease-out ${inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
              style={{ transitionDelay: `${PHOTO_DELAY_MS + i * STAGGER_MS}ms` }}
            >
              <div className="group h-full rounded-2xl border border-white/10 bg-ink-900/70 p-5 backdrop-blur-md transition hover:-translate-y-1 hover:border-teamA/50 lg:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-teamA/40 bg-teamA/10 text-sm font-bold text-teamA transition group-hover:scale-110">
                  {initials(m.name)}
                </span>
                <p className="mt-4 text-lg font-semibold text-white">{m.name}</p>
                <p className="text-sm text-teamA">{m.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
