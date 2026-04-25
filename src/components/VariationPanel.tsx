import { useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useStore } from '../state/store';
import type { PositionEvalLine } from '../game/types';

const MAX_PV_PLIES = 8;

function formatLineEval(line: PositionEvalLine): string {
  if (line.mate !== undefined) {
    const sign = line.mate >= 0 ? '+' : '−';
    return `${sign}M${Math.abs(line.mate)}`;
  }
  if (line.cp !== undefined) {
    const pawn = line.cp / 100;
    const sign = pawn >= 0 ? '+' : '';
    return `${sign}${pawn.toFixed(2)}`;
  }
  return '—';
}

function uciLineToSan(startFen: string, uci: string[], maxPlies = MAX_PV_PLIES): {
  sans: string[];
  truncated: boolean;
} {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return { sans: [], truncated: false };
  }
  const sans: string[] = [];
  const limit = Math.min(uci.length, maxPlies);
  for (let i = 0; i < limit; i++) {
    const u = uci[i];
    if (!u || u.length < 4) break;
    const from = u.slice(0, 2);
    const to = u.slice(2, 4);
    const promotion = u.length > 4 ? u.slice(4, 5) : undefined;
    try {
      const m = chess.move({ from, to, promotion });
      if (!m) break;
      sans.push(m.san);
    } catch {
      break;
    }
  }
  return { sans, truncated: uci.length > sans.length };
}

function renderSanWithNumbers(
  sans: string[],
  startFen: string,
  truncated: boolean,
): string {
  if (sans.length === 0) return '';
  const parts = startFen.split(' ');
  let fullmove = parseInt(parts[5] ?? '1', 10) || 1;
  let whiteToMove = parts[1] === 'w';
  const out: string[] = [];
  for (let i = 0; i < sans.length; i++) {
    if (whiteToMove) {
      out.push(`${fullmove}.`);
    } else if (i === 0) {
      out.push(`${fullmove}…`);
    }
    out.push(sans[i]);
    if (!whiteToMove) fullmove++;
    whiteToMove = !whiteToMove;
  }
  return out.join(' ') + (truncated ? ' …' : '');
}

export function VariationPanel() {
  const game = useStore((s) => s.game);
  const exploration = useStore((s) => s.exploration);
  const undoExplorationMove = useStore((s) => s.undoExplorationMove);
  const exitExploration = useStore((s) => s.exitExploration);
  const truncateExploration = useStore((s) => s.truncateExploration);
  const explorationMultiPV = useStore((s) => s.explorationMultiPV);
  const setExplorationMultiPV = useStore((s) => s.setExplorationMultiPV);

  const tailRef = useRef<HTMLButtonElement>(null);
  const tipIdx = exploration ? exploration.line.length - 1 : -1;

  useEffect(() => {
    if (tailRef.current) tailRef.current.scrollIntoView({ block: 'nearest' });
  }, [tipIdx]);

  const tipFen = useMemo(() => {
    if (!exploration || exploration.line.length === 0) return null;
    return exploration.line[exploration.line.length - 1].fenAfter;
  }, [exploration]);

  const tipEval =
    exploration && exploration.line.length > 0
      ? exploration.analyses[exploration.line.length - 1]
      : null;

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

  const baseLabel = startsWhite ? `before ${startFullmove}.` : `after ${startFullmove}…`;

  const lines = tipEval?.lines ?? [];
  const visibleLines = lines.slice(0, explorationMultiPV);

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
          <span className="text-slate-500">Drag or click a piece to start a line.</span>
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

      <div className="space-y-1.5 border-t border-slate-700/60 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Engine lines</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Show</span>
            <select
              value={explorationMultiPV}
              onChange={(e) => setExplorationMultiPV(Number(e.target.value))}
              aria-label="Number of engine lines"
              className="rounded bg-slate-900 px-2 py-0.5 text-xs text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-emerald-500"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        {tipFen && visibleLines.length > 0 ? (
          <ul className="space-y-1">
            {visibleLines.map((line, i) => {
              const { sans, truncated } = uciLineToSan(tipFen, line.pv);
              return (
                <li key={i} className="flex items-baseline gap-2 text-xs leading-tight">
                  <span className="w-12 shrink-0 text-right font-mono text-slate-100">
                    {formatLineEval(line)}
                  </span>
                  <span
                    className="truncate font-mono text-slate-300"
                    title={sans.join(' ')}
                  >
                    {renderSanWithNumbers(sans, tipFen, truncated)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-xs text-slate-500">
            {exploration.analyzing ? 'analysing…' : '—'}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {tipEval && <span>d{tipEval.depth}</span>}
          {exploration.analyzing && <span>analysing…</span>}
          {exploration.analyzeError && (
            <span className="text-red-300">{exploration.analyzeError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
