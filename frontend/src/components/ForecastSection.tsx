import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { usePrediction } from '../hooks/usePrediction';
import { forecastService } from '../services/forecastService';
import { randomPair } from '../utils/random';
import { ForecastResult } from './forecast/ForecastResult';
import { TeamPicker } from './forecast/TeamPicker';
import { TeamStats } from './forecast/TeamStats';
import { VsBadge } from './forecast/VsBadge';
import { RetryMessage } from './ui/RetryMessage';
import { SectionHeader } from './ui/SectionHeader';

/** Seccion "Pronostico": eleccion de las dos selecciones y resultado del modelo. */
export function ForecastSection() {
  const teams = useAsync((signal) => forecastService.teams(signal));
  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);
  const prediction = usePrediction(teamA, teamB);

  const list = teams.data ?? [];
  const a = list.find((t) => t.id === teamA);
  const b = list.find((t) => t.id === teamB);

  const swap = () => {
    setTeamA(teamB);
    setTeamB(teamA);
  };
  const randomize = () => {
    const pair = randomPair(list);
    if (!pair) return;
    setTeamA(pair[0].id);
    setTeamB(pair[1].id);
  };

  return (
    <section id="pronostico" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:scroll-mt-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Pronóstico" title="Elige el VS">
          Solo selecciones clasificadas al Mundial 2026. El modelo calcula al instante la probabilidad de cada
          resultado.
        </SectionHeader>

        <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-4 shadow-xl shadow-black/30 backdrop-blur-md sm:p-8 lg:p-12">
          {teams.status === 'loading' && <p className="py-16 text-center text-slate-400">Conectando con el modelo…</p>}
          {teams.status === 'error' && <RetryMessage message={teams.error.message} onRetry={teams.retry} />}
          {teams.status === 'success' && (
            <>
              <div className="grid items-start gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
                <div>
                  <TeamPicker
                    label="Equipo A"
                    side="a"
                    teams={list}
                    value={teamA}
                    disabledId={teamB}
                    onChange={setTeamA}
                  />
                  {a && <TeamStats team={a} side="a" />}
                </div>
                <VsBadge onSwap={swap} canSwap={Boolean(teamA || teamB)} />
                <div>
                  <TeamPicker
                    label="Equipo B"
                    side="b"
                    teams={list}
                    value={teamB}
                    disabledId={teamA}
                    onChange={setTeamB}
                  />
                  {b && <TeamStats team={b} side="b" />}
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8 lg:mt-12 lg:pt-10">
                <ForecastResult
                  state={prediction.state}
                  teams={list}
                  onRetry={prediction.retry}
                  onRandomize={randomize}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
