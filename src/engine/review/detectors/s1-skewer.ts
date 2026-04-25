import { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import type { Detector, PieceSymbol, Square } from '../types';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  ...BISHOP_DIRS,
  ...ROOK_DIRS,
];

function dirsFor(piece: PieceSymbol): ReadonlyArray<readonly [number, number]> {
  if (piece === 'b') return BISHOP_DIRS;
  if (piece === 'r') return ROOK_DIRS;
  if (piece === 'q') return QUEEN_DIRS;
  return [];
}

function sqToFR(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1], 10) - 1];
}

function frToSq(f: number, r: number): Square | null {
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return (FILES[f] + (r + 1)) as Square;
}

interface SkewerHit {
  sliderSq: Square;
  sliderType: PieceSymbol;
  frontSq: Square;
  frontType: PieceSymbol;
  backSq: Square;
  backType: PieceSymbol;
}

function findSkewers(
  board: Chess,
  mover: Color,
  pieceValue: (t: PieceSymbol) => number,
): SkewerHit[] {
  const hits: SkewerHit[] = [];
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = (file + rank) as Square;
      const p = board.get(sq);
      if (!p || p.color !== mover) continue;
      if (p.type !== 'b' && p.type !== 'r' && p.type !== 'q') continue;
      const [f0, r0] = sqToFR(sq);
      for (const [df, dr] of dirsFor(p.type)) {
        // Walk to find front piece on this ray.
        let f = f0 + df;
        let r = r0 + dr;
        let frontSq: Square | null = null;
        let frontType: PieceSymbol | null = null;
        while (true) {
          const cur = frToSq(f, r);
          if (!cur) break;
          const cp = board.get(cur);
          if (cp) {
            if (cp.color === enemy) {
              frontSq = cur;
              frontType = cp.type;
            }
            break;
          }
          f += df;
          r += dr;
        }
        if (!frontSq || !frontType) continue;
        const frontVal = pieceValue(frontType);
        // Front must be a meaningful target (≥ minor piece, or king).
        if (frontType !== 'k' && frontVal < 3) continue;
        // Walk past front to find back piece on the same ray.
        const [ff, fr] = sqToFR(frontSq);
        let bf = ff + df;
        let br = fr + dr;
        let backSq: Square | null = null;
        let backType: PieceSymbol | null = null;
        while (true) {
          const cur = frToSq(bf, br);
          if (!cur) break;
          const cp = board.get(cur);
          if (cp) {
            if (cp.color === enemy) {
              backSq = cur;
              backType = cp.type;
            }
            break;
          }
          bf += df;
          br += dr;
        }
        if (!backSq || !backType) continue;
        const backVal = pieceValue(backType);
        // Strictly: front more valuable than back. King front always
        // qualifies (king is highest in our value table at 100).
        if (frontVal <= backVal) continue;
        // Back piece must be a meaningful target. Real-game audit
        // (2026-04-25) showed S1 firing on skewers through pawn backstops
        // that the engine never actually captured. Require ≥ minor piece.
        if (backVal < 3) continue;
        hits.push({
          sliderSq: sq,
          sliderType: p.type,
          frontSq,
          frontType,
          backSq,
          backType,
        });
      }
    }
  }
  return hits;
}

function key(h: SkewerHit): string {
  return `${h.sliderSq}|${h.frontSq}|${h.backSq}`;
}

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { prevBoard, bestBoard, bestReplay, mover, helpers, lossVsBest } = ctx;

  // G1 covers direct captures; defer to it.
  const firstBest = bestReplay.moves[0];
  if (!firstBest) return null;
  if (firstBest.captured) return null;

  // The skewer must actually win material. Real-game audit (2026-04-25)
  // showed S1 firing on geometric skewers (queen "skewers" knight through
  // a pawn) that nett zero — the front piece moves and the back-pawn
  // backstop is never relevant. Same gate as F1/G1/L1.
  if (lossVsBest < 1.5) return null;

  const prevHits = findSkewers(prevBoard, mover, helpers.pieceValue);
  const bestHits = findSkewers(bestBoard, mover, helpers.pieceValue);
  if (bestHits.length === 0) return null;

  const prevKeys = new Set(prevHits.map(key));
  const newHit = bestHits.find((h) => !prevKeys.has(key(h)));
  if (!newHit) return null;

  const bestSan = firstBest.san;
  if (newHit.frontType === 'k') {
    return {
      id: 'S1',
      comment:
        `Missed ${bestSan} — skewers the king on ${newHit.frontSq}, ` +
        `winning the ${helpers.pieceName(newHit.backType)} on ${newHit.backSq} behind.`,
    };
  }
  return {
    id: 'S1',
    comment:
      `Missed ${bestSan} — skewers the ${helpers.pieceName(newHit.frontType)} ` +
      `on ${newHit.frontSq} through the ${helpers.pieceName(newHit.backType)} ` +
      `on ${newHit.backSq}.`,
  };
};
