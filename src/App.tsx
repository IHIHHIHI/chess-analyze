import { useEffect } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { EvalBar } from './components/EvalBar';
import { EvalGraph } from './components/EvalGraph';
import { GameImport } from './components/GameImport';
import { MoveList } from './components/MoveList';
import { ReviewSummary } from './components/ReviewSummary';
import { VariationPanel } from './components/VariationPanel';
import { useStore } from './state/store';

export default function App() {
  const next = useStore((s) => s.next);
  const prev = useStore((s) => s.prev);
  const first = useStore((s) => s.first);
  const last = useStore((s) => s.last);
  const flip = useStore((s) => s.flip);
  const exitExploration = useStore((s) => s.exitExploration);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
      switch (e.key) {
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          prev();
          break;
        case 'Home':
          first();
          break;
        case 'End':
          last();
          break;
        case 'f':
        case 'F':
          flip();
          break;
        case 'Escape':
          exitExploration();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, first, last, flip, exitExploration]);

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-3">
        <h1 className="text-xl font-semibold">Chess Review</h1>
        <p className="text-xs text-slate-400">
          Import a game (PGN or FEN), let Stockfish analyse every position, and review the result.
        </p>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <GameImport />
          <ReviewSummary />
        </section>

        <section className="flex flex-col items-center gap-3">
          <div className="flex w-full max-w-[700px] items-stretch gap-2">
            <EvalBar />
            <div className="flex-1">
              <Board />
            </div>
          </div>
          <Controls />
          <div className="w-full max-w-[700px]">
            <VariationPanel />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <MoveList />
          <EvalGraph />
        </section>
      </main>

      <footer className="px-6 pb-6 text-xs text-slate-500">
        Use ← / → to step, Home / End to jump, F to flip the board. Drag a piece — or click a
        piece and then a highlighted square — to test a variation; Esc returns to the game.
      </footer>
    </div>
  );
}
