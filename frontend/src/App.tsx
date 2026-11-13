import { ForecastSection } from './components/ForecastSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ModelSection } from './components/ModelSection';
import { TeamSection } from './components/team/TeamSection';

export default function App() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(70%_50%_at_50%_0%,rgb(var(--team-a)/.07),transparent)]" />
      <Header />
      <main>
        <Hero />
        <ForecastSection />
        <ModelSection />
        <TeamSection />
      </main>
      <Footer />
    </>
  );
}
