import type { Category, Color, MoveAnalysis, PositionEval } from '../game/types';

const MATE_CP = 100000;

export function evalToCp(e: PositionEval | null | undefined): number {
  if (!e) return 0;
  if (e.mate !== undefined) return e.mate >= 0 ? MATE_CP : -MATE_CP;
  return e.cp ?? 0;
}

export function cpToWinPct(cp: number): number {
  // Clamp absurdly large mate-equivalents to avoid floating overflow.
  const x = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * x)) - 1);
}

export function winPctToAccuracy(before: number, after: number): number {
  const drop = Math.max(0, before - after);
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

interface ClassifyInput {
  prevEval: PositionEval;
  currEval: PositionEval;
  mover: Color;
  playedUci: string;
}

export function classifyMove(input: ClassifyInput): MoveAnalysis {
  const { prevEval, currEval, mover, playedUci } = input;

  // White-POV centipawns.
  const beforeWhite = evalToCp(prevEval);
  const afterWhite = evalToCp(currEval);

  // Convert to mover's POV.
  const sign = mover === 'w' ? 1 : -1;
  const beforeMover = sign * beforeWhite;
  const afterMover = sign * afterWhite;

  const winPctBefore = cpToWinPct(beforeMover);
  const winPctAfter = cpToWinPct(afterMover);
  const accuracy = winPctToAccuracy(winPctBefore, winPctAfter);
  const delta = winPctBefore - winPctAfter;

  const bestMoveUci = prevEval.bestMoveUci;
  const isBest = bestMoveUci !== null && playedUci === bestMoveUci;

  let category: Category;
  if (isBest) category = 'best';
  else if (delta < 2) category = 'excellent';
  else if (delta < 5) category = 'good';
  else if (delta < 10) category = 'inaccuracy';
  else if (delta < 20) category = 'mistake';
  else category = 'blunder';

  return {
    category,
    accuracy,
    winPctBefore,
    winPctAfter,
    delta,
    bestMoveUci,
    playedUci,
  };
}

export function categoryLabel(c: Category): string {
  return c[0].toUpperCase() + c.slice(1);
}

// TODO(v2): "Brilliant" / "Great" detection (sacrificial only-good moves) and
// opening-book filtering would refine classifications further.
