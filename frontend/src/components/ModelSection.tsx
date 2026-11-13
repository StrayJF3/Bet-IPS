import { useAsync } from '../hooks/useAsync';
import { forecastService } from '../services/forecastService';
import { date, int, pct } from '../utils/format';
import { SectionHeader } from './ui/SectionHeader';

const STEPS = [
  {
    n: '01',
    title: 'Historia',
    text: 'Casi 50.000 partidos internacionales desde 1872, cruzados con el ranking FIFA de cada selección (el ranking existe desde 1993).',
  },
  {
    n: '02',
    title: 'Variables',
    text: 'Ranking y puntos FIFA de cada selección, su forma en los últimos 5 partidos, las diferencias entre ambas y si el campo es neutral.',
  },
  {
    n: '03',
    title: 'Predicción',
    text: 'KNN busca los 15 partidos históricos más parecidos y de ahí salen las probabilidades de victoria, empate y derrota. Corre en un servidor EC2.',
  },
];

export function ModelSection() {
  const model = useAsync((signal) => forecastService.model(signal));
  const m = model.data;

  const stats = m
    ? [
        {
          label: 'Acierto en prueba',
          value: pct(m.metrics.accuracy, 1),
          hint: `${m.metrics.hits} de ${m.metrics.test_matches} · ${m.metrics.test_set} (elegir siempre lo más común: ${pct(m.metrics.baseline_accuracy)})`,
        },
        {
          label: 'F1-Score (macro)',
          value: m.metrics.f1_macro.toFixed(2),
          hint: `Precision ${m.metrics.precision.toFixed(2)} · Recall ${m.metrics.recall.toFixed(2)}`,
        },
        {
          label: 'Partidos de entrenamiento',
          value: int(m.metrics.final_train_matches),
          hint: `Datos hasta el ${date(m.data_until)}`,
        },
      ]
    : [];

  return (
    <section id="modelo" className="scroll-mt-28 lg:scroll-mt-32 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="El modelo" title="Cómo piensa" />

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 backdrop-blur-md">
              <p className="text-xs uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.hint}</p>
            </div>
          ))}
          {model.status === 'loading' &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/5 bg-ink-900/40" />
            ))}
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-white/5 p-6 transition hover:border-white/15 hover:bg-white/[.02]"
            >
              <span className="font-mono text-xs text-teamA">{s.n}</span>
              <h3 className="mt-2 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
