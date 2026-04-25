import { Chess } from 'chess.js';
import type { Color } from '../../game/types';
import type {
  DetectorHelpers,
  PieceSymbol,
  ReplayResult,
  Square,
  VerboseMove,
} from './types';

// Tunables — kept inline so detectors share identical thresholds.
export const REPLAY_PLIES = 6;
export const RECAPTURE_LOOKAHEAD = 2;
export const MIN_MATERIAL_LOSS = 1.5;
export const MIN_WIN_PCT_DROP = 5;
export const MIN_WIN_PCT_DROP_POSITIONAL = 10;
export const SINGLE_CAPTURE_TOLERANCE = 1;

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

export function pieceValue(t: PieceSymbol): number {
  return PIECE_VALUE[t];
}

export function pieceName(t: PieceSymbol): string {
  return PIECE_NAME[t];
}

export function uciToInput(
  uci: string,
): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}

export function cloneBoard(board: Chess): Chess {
  const c = new Chess();
  c.load(board.fen());
  return c;
}

export function replayLine(
  startFen: string,
  uciList: string[],
  maxPlies: number,
): ReplayResult {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return { finalFen: startFen, moves: [], finalBoard: chess };
  }
  const moves: VerboseMove[] = [];
  const limit = Math.min(uciList.length, maxPlies);
  for (let i = 0; i < limit; i++) {
    const input = uciToInput(uciList[i]);
    if (!input) break;
    try {
      const m = chess.move(input);
      if (!m) break;
      moves.push(m as unknown as VerboseMove);
    } catch {
      break;
    }
  }
  return { finalFen: chess.fen(), moves, finalBoard: chess };
}

export function countMaterial(fen: string): { w: number; b: number } {
  const board = fen.split(' ')[0];
  let w = 0;
  let b = 0;
  for (const ch of board) {
    switch (ch) {
      case 'P': w += 1; break;
      case 'p': b += 1; break;
      case 'N': case 'B': w += 3; break;
      case 'n': case 'b': b += 3; break;
      case 'R': w += 5; break;
      case 'r': b += 5; break;
      case 'Q': w += 9; break;
      case 'q': b += 9; break;
      default: break;
    }
  }
  return { w, b };
}

export function moverMargin(fen: string, mover: Color): number {
  const m = countMaterial(fen);
  return mover === 'w' ? m.w - m.b : m.b - m.w;
}

export interface CaptureCandidate {
  piece: PieceSymbol;
  square: Square;
  san: string;
  net: number;
}

export function findUncompensatedCapture(
  moves: VerboseMove[],
  capturerColor: Color,
  recaptureLookahead: number = RECAPTURE_LOOKAHEAD,
): CaptureCandidate | null {
  let best: CaptureCandidate | null = null;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color !== capturerColor || !m.captured) continue;
    let net = pieceValue(m.captured);
    for (let j = i + 1; j <= i + recaptureLookahead && j < moves.length; j++) {
      const r = moves[j];
      if (r.color === capturerColor) continue;
      if (r.captured && r.to === m.to) {
        net -= pieceValue(r.captured);
        break;
      }
    }
    if (net <= 0) continue;
    if (!best || net > best.net) {
      best = { piece: m.captured, square: m.to, san: m.san, net };
    }
  }
  return best;
}

export function attackersOf(
  board: Chess,
  sq: Square,
  color: Color,
): Square[] {
  return board.attackers(sq, color);
}

export function defendersOf(board: Chess, sq: Square): Square[] {
  const piece = board.get(sq);
  if (!piece) return [];
  return attackersOf(board, sq, piece.color);
}

export const helpers: DetectorHelpers = {
  pieceValue,
  pieceName,
  attackersOf,
  defendersOf,
  cloneBoard,
};
