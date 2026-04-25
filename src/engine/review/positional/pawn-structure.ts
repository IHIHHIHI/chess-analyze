import type { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import type { Square } from '../types';
import {
  fileChar,
  fileOf,
  rankOf,
  squareAt,
  squareIsDark,
} from './king-zone';

// Returns pawn squares on each file (a..h) for the given color.
// Map key is file index 0..7.
export function pawnsByFile(
  board: Chess,
  color: Color,
): Map<number, Square[]> {
  const out = new Map<number, Square[]>();
  const rows = board.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = rows[r][f];
      if (cell && cell.type === 'p' && cell.color === color) {
        const arr = out.get(f) ?? [];
        arr.push(cell.square);
        out.set(f, arr);
      }
    }
  }
  return out;
}

export function bishopsOf(board: Chess, color: Color): Square[] {
  const out: Square[] = [];
  const rows = board.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = rows[r][f];
      if (cell && cell.type === 'b' && cell.color === color) {
        out.push(cell.square);
      }
    }
  }
  return out;
}

// Pawn squares of `color` whose adjacent files have no friendly pawns.
export function isolatedPawns(board: Chess, color: Color): Square[] {
  const byFile = pawnsByFile(board, color);
  const out: Square[] = [];
  for (const [f, squares] of byFile) {
    const left = byFile.get(f - 1);
    const right = byFile.get(f + 1);
    if (!left && !right) {
      for (const sq of squares) out.push(sq);
    }
  }
  return out;
}

// Backward pawns: a mover-pawn whose advance square is attacked by an
// opponent pawn AND has no friendly pawns on adjacent files at the same
// rank or behind it. (Behind = lower rank for white, higher for black.)
export function backwardPawns(board: Chess, color: Color): Square[] {
  const out: Square[] = [];
  const dir = color === 'w' ? 1 : -1;
  const opponent: Color = color === 'w' ? 'b' : 'w';
  const ownByFile = pawnsByFile(board, color);

  for (const [f, squares] of ownByFile) {
    for (const sq of squares) {
      const r = rankOf(sq);
      const advance = squareAt(f, r + dir);
      if (!advance) continue; // already on the back/promotion edge
      // Check that an opponent pawn attacks `advance` square.
      // Opponent pawn on adjacent file at rank (advance.rank + opp-dir) attacks `advance`.
      // Opp moves opposite direction: opp pawn must be at rank advance.rank - opp_dir,
      // i.e. r + 2*dir on adjacent file. But that's deep — we need: opponent pawn
      // sits on a square s where s.rank + (-dir) = advance.rank and |s.file - advance.file| = 1.
      // Equivalently: s.rank = advance.rank + dir = r + 2*dir.
      const attackRank = r + 2 * dir;
      let attacked = false;
      for (const adjF of [f - 1, f + 1]) {
        if (adjF < 0 || adjF > 7) continue;
        const oppPawnSq = squareAt(adjF, attackRank);
        if (!oppPawnSq) continue;
        const piece = board.get(oppPawnSq);
        if (piece && piece.type === 'p' && piece.color === opponent) {
          attacked = true;
          break;
        }
      }
      if (!attacked) continue;
      // Check no friendly pawn on adjacent files at rank ≤ r (white) or ≥ r (black).
      let supported = false;
      for (const adjF of [f - 1, f + 1]) {
        if (adjF < 0 || adjF > 7) continue;
        const adjPawns = ownByFile.get(adjF);
        if (!adjPawns) continue;
        for (const p of adjPawns) {
          const pr = rankOf(p);
          if (color === 'w' ? pr <= r : pr >= r) {
            supported = true;
            break;
          }
        }
        if (supported) break;
      }
      if (!supported) out.push(sq);
    }
  }
  return out;
}

// Squares that can never again be attacked by a `color` pawn.
// A pawn on file F at rank R attacks (F-1, R+dir) and (F+1, R+dir); it can
// continue to advance one square at a time, so once any pawn that *could*
// have attacked s is in front of s (already past it) or off the board,
// s is permanently unreachable by a color pawn.
//
// For target square s at (sf, sr), color's pawns on files sf-1 and sf+1
// can attack s iff one of them is at rank sr - dir (one rank "behind" s,
// in mover's direction). Future pawns reach sr - dir by advancing. So a
// pawn on (adjF, R) with R such that the pawn can still reach (adjF, sr - dir)
// before promoting/blocking is fine. For white (dir=+1), the pawn must satisfy
// R ≤ sr - 1 (can advance forward to sr - 1). For black (dir=-1), R ≥ sr + 1.
export function holesIn(board: Chess, color: Color): Square[] {
  const ownByFile = pawnsByFile(board, color);
  // Consider the wider middle of the board: ranks 3..6 (indices 2..5) for
  // both sides. The "king-zone hole" concept lives in front of one's own
  // pawn shield, which for a king on rank 1 lives on ranks 3–5 and for a
  // king on rank 8 lives on ranks 4–6. We include all four to keep the
  // helper general; the PS4 detector filters by proximity to the king.
  const half = color === 'w' ? [2, 3, 4, 5] : [2, 3, 4, 5];
  const out: Square[] = [];

  for (const sr of half) {
    for (let sf = 0; sf < 8; sf++) {
      const s = squareAt(sf, sr);
      if (!s) continue;
      // s itself can be empty or occupied — what matters is reachability by
      // a friendly pawn attack.
      let reachable = false;
      for (const adjF of [sf - 1, sf + 1]) {
        if (adjF < 0 || adjF > 7) continue;
        const adjPawns = ownByFile.get(adjF);
        if (!adjPawns) continue;
        for (const pSq of adjPawns) {
          const pr = rankOf(pSq);
          // Pawn can reach (adjF, sr - dir) i.e. attacks s if it can advance
          // to the square one rank behind s in mover direction.
          if (color === 'w' ? pr <= sr - 1 : pr >= sr + 1) {
            reachable = true;
            break;
          }
        }
        if (reachable) break;
      }
      if (!reachable) out.push(s);
    }
  }
  return out;
}

// Helper for PS7 — count pawns of `color` sitting on dark squares.
export function pawnsOnColor(
  board: Chess,
  color: Color,
  dark: boolean,
): number {
  const rows = board.board();
  let n = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = rows[r][f];
      if (cell && cell.type === 'p' && cell.color === color) {
        if (squareIsDark(cell.square) === dark) n++;
      }
    }
  }
  return n;
}

// Returns the file letter for a square (e.g. "e4" → "e").
export function fileLetterOf(sq: Square): string {
  return fileChar(fileOf(sq));
}
