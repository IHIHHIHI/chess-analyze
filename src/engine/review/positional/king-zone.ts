import type { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import type { Square } from '../types';

// File/rank arithmetic helpers, kept in sync with the conventions used by
// detectors/p1-pin.ts.
export function fileOf(sq: Square): number {
  return sq.charCodeAt(0) - 97; // 'a' = 97 → 0
}

export function rankOf(sq: Square): number {
  return sq.charCodeAt(1) - 49; // '1' = 49 → 0
}

export function squareAt(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return (String.fromCharCode(97 + file) + String.fromCharCode(49 + rank)) as Square;
}

// chess.com / a1-is-dark convention: dark when (file + rank) is even.
export function squareIsDark(sq: Square): boolean {
  return (fileOf(sq) + rankOf(sq)) % 2 === 0;
}

export function squareColorName(sq: Square): 'light' | 'dark' {
  return squareIsDark(sq) ? 'dark' : 'light';
}

export function fileChar(fileIdx: number): string {
  return String.fromCharCode(97 + fileIdx);
}

export function kingSquare(board: Chess, color: Color): Square | null {
  const rows = board.board(); // rows[0] = rank 8, rows[7] = rank 1
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = rows[r][f];
      if (cell && cell.type === 'k' && cell.color === color) {
        return cell.square;
      }
    }
  }
  return null;
}

// Chebyshev-distance ≤ 2 ring around the king (excludes the king square).
export function kingZoneSquares(kingSq: Square): Square[] {
  const out: Square[] = [];
  const kf = fileOf(kingSq);
  const kr = rankOf(kingSq);
  for (let df = -2; df <= 2; df++) {
    for (let dr = -2; dr <= 2; dr++) {
      if (df === 0 && dr === 0) continue;
      const sq = squareAt(kf + df, kr + dr);
      if (sq) out.push(sq);
    }
  }
  return out;
}
