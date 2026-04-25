import { useStore } from '../state/store';
import type { PositionEval } from '../game/types';

export function EvalBar() {
  const ply = useStore((s) => s.ply);
  const orientation = useStore((s) => s.orientation);
  const analyses = useStore((s) => s.analyses);
  const exploration = useStore((s) => s.exploration);

  let evaluation: PositionEval | null | undefined;
  if (exploration && exploration.line.length > 0) {
    evaluation = exploration.analyses[exploration.line.length - 1];
  } else if (exploration) {
    evaluation = analyses[exploration.rootPly];
  } else {
    evaluation = analyses[ply];
  }

  // Compute a 0..100 percentage representing white's share of the bar.
  let whitePct = 50;
  let label = '0.0';
  let mateLabel: string | null = null;

  if (evaluation) {
    if (evaluation.mate !== undefined) {
      whitePct = evaluation.mate >= 0 ? 100 : 0;
      mateLabel = `M${Math.abs(evaluation.mate)}`;
      label = mateLabel;
    } else if (evaluation.cp !== undefined) {
      const cp = Math.max(-1000, Math.min(1000, evaluation.cp));
      whitePct = 50 + (cp / 1000) * 50;
      const pawn = evaluation.cp / 100;
      const sign = pawn >= 0 ? '+' : '';
      label = `${sign}${pawn.toFixed(2)}`;
    }
  }

  // When board is flipped, white is on top; otherwise white is on bottom.
  const whiteOnBottom = orientation === 'white';
  const whiteHeight = `${whitePct}%`;

  return (
    <div className="relative flex h-full w-7 flex-col overflow-hidden rounded border border-slate-700 bg-slate-900">
      {whiteOnBottom ? (
        <>
          <div className="flex-1 bg-slate-800" />
          <div style={{ height: whiteHeight }} className="bg-slate-100 transition-all duration-200" />
        </>
      ) : (
        <>
          <div style={{ height: whiteHeight }} className="bg-slate-100 transition-all duration-200" />
          <div className="flex-1 bg-slate-800" />
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-1 text-center font-mono text-[10px] font-bold text-slate-300">
        {orientation === 'white' ? (whitePct < 50 ? label : '') : (whitePct >= 50 ? label : '')}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10px] font-bold text-slate-700">
        {orientation === 'white' ? (whitePct >= 50 ? label : '') : (whitePct < 50 ? label : '')}
      </div>
    </div>
  );
}
