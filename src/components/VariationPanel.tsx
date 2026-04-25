import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

export function VariationPanel() {
  const game = useStore((s) => s.game);
  const exploration = useStore((s) => s.exploration);
  const undoExplorationMove = useStore((s) => s.undoExplorationMove);
  const exitExploration = useStore((s) => s.exitExploration);
  const truncateExploration = useStore((s) => s.truncateExploration);

  const tailRef = useRef<HTMLButtonElement>(null);
  const tipIdx = exploration ? exploration.line.length - 1 : -1;

  useEffect(() => {
    if (tailRef.current) tailRef.current.scrollIntoView({ block: 'nearest' });
  }, [tipIdx]);

  if (!game || !exploration) return null;

  const rootFen = game.positions[exploration.rootPly];
  const rootParts = rootFen.split(' ');
  const startFullmove = parseInt(rootParts[5] ?? '1', 10) || 1;
  const startsWhite = rootParts[1] === 'w';

  type Token = { kind: 'num'; text: string } | { kind: 'move'; index: number; san: string };
  const tokens: Token[] = [];
  let fullmove = startFullmove;
  let whiteToMove = startsWhite;
  for (let i = 0; i < exploration.line.length; i++) {
    if (whiteToMove) {
      tokens.push({ kind: 'num', text: `${fullmove}.` });
    } else if (i === 0) {
      tokens.push({ kind: 'num', text: `${fullmove}…` });
    }
    tokens.push({ kind: 'move', index: i, san: exploration.line[i].san });
    if (!whiteToMove) fullmove++;
    whiteToMove = !whiteToMove;
  }

  const tipEval =
    exploration.line.length > 0 ? exploration.analyses[exploration.line.length - 1] : null;
  let evalLabel = '—';
  if (tipEval) {
    if (tipEval.mate !== undefined) {
      const sign = tipEval.mate >= 0 ? '+' : '−';
      evalLabel = `${sign}M${Math.abs(tipEval.mate)}`;
    } else if (tipEval.cp !== undefined) {
      const pawn = tipEval.cp / 100;
      const sign = pawn >= 0 ? '+' : '';
      evalLabel = `${sign}${pawn.toFixed(2)}`;
    }
  }

  const baseMoveNumber = startsWhite ? startFullmove : startFullmove;
  const baseLabel = startsWhite
    ? `before ${baseMoveNumber}.`
    : `after ${baseMoveNumber}…`;

  return (
    <div className="space-y-2 rounded border border-emerald-500/40 bg-slate-800 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-300">Variation</div>
          <div className="text-[11px] text-slate-400">{`Branched ${baseLabel}`}</div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={undoExplorationMove}
            disabled={exploration.line.length === 0}
            aria-label="Undo last variation move"
            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={exitExploration}
            aria-label="Exit variation"
            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1 font-mono text-sm leading-tight text-slate-200">
        {tokens.length === 0 && (
          <span className="text-slate-500">Drag a piece on the board to start a line.</span>
        )}
        {tokens.map((t, k) =>
          t.kind === 'num' ? (
            <span key={`n${k}`} className="text-slate-500">{t.text}</span>
          ) : (
            <button
              key={`m${t.index}`}
              ref={t.index === tipIdx ? tailRef : undefined}
              type="button"
              onClick={() => truncateExploration(t.index + 1)}
              className={`rounded px-1 py-0.5 transition ${
                t.index === tipIdx
                  ? 'bg-emerald-700/40 text-white'
                  : 'text-slate-100 hover:bg-slate-700'
              }`}
            >
              {t.san}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-700/60 pt-2 text-xs">
        <span className="text-slate-400">Engine</span>
        <span className="font-mono text-slate-100">{evalLabel}</span>
        {tipEval && <span className="text-slate-500">d{tipEval.depth}</span>}
        {exploration.analyzing && <span className="text-slate-400">analysing…</span>}
        {exploration.analyzeError && (
          <span className="text-red-300">{exploration.analyzeError}</span>
        )}
      </div>
    </div>
  );
}
