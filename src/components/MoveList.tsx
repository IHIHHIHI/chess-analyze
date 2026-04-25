import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { ClassificationBadge } from './ClassificationBadge';

export function MoveList() {
  const game = useStore((s) => s.game);
  const ply = useStore((s) => s.ply);
  const setPly = useStore((s) => s.setPly);
  const classifications = useStore((s) => s.classifications);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [ply]);

  if (!game) {
    return (
      <div className="rounded bg-slate-800 p-4 text-sm text-slate-400">
        Import a game to see moves.
      </div>
    );
  }

  if (game.moves.length === 0) {
    return (
      <div className="rounded bg-slate-800 p-4 text-sm text-slate-400">
        Single-position analysis (no moves).
      </div>
    );
  }

  const startNumber = parseInt(game.startingFen.split(' ')[5] ?? '1', 10) || 1;
  const startsBlack = game.startingFen.split(' ')[1] === 'b';

  const rows: { number: number; white?: number; black?: number }[] = [];
  for (let i = 0; i < game.moves.length; i++) {
    const fullmove = startNumber + Math.floor((i + (startsBlack ? 1 : 0)) / 2);
    const isWhite = game.moves[i].color === 'w';
    const last = rows[rows.length - 1];
    if (isWhite || !last || last.number !== fullmove) {
      rows.push({ number: fullmove, [isWhite ? 'white' : 'black']: i });
    } else {
      last.black = i;
    }
  }

  const Cell = ({ moveIndex }: { moveIndex?: number }) => {
    if (moveIndex === undefined) return <span className="inline-block w-full" />;
    const move = game.moves[moveIndex];
    const cls = classifications[moveIndex];
    const targetPly = moveIndex + 1;
    const active = ply === targetPly;
    return (
      <button
        ref={active ? activeRef : undefined}
        type="button"
        onClick={() => setPly(targetPly)}
        className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm font-mono transition ${
          active ? 'bg-slate-600 text-white' : 'text-slate-200 hover:bg-slate-700'
        }`}
      >
        <span className="flex-1">{move.san}</span>
        {cls && <ClassificationBadge category={cls.category} />}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="max-h-[480px] overflow-y-auto rounded bg-slate-800 p-2">
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-x-1 gap-y-0.5">
        {rows.map((r) => (
          <div key={r.number} className="contents">
            <div className="px-1 py-1 text-right font-mono text-xs text-slate-500">{r.number}.</div>
            <Cell moveIndex={r.white} />
            <Cell moveIndex={r.black} />
          </div>
        ))}
      </div>
    </div>
  );
}
