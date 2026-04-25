import { Chess } from 'chess.js';
import type { Category, Color, PositionEval } from '../game/types';
import { cpToWinPct, evalToCp } from './classify';

// Tunables. Values are conservative — we want high precision over recall.
const REPLAY_PLIES = 6;
const RECAPTURE_LOOKAHEAD = 2;
const MIN_MATERIAL_LOSS = 1.5;
const MIN_WIN_PCT_DROP = 5;
// How tightly the named uncompensated capture must match the overall material
// delta between the best and played lines. Loose enough to absorb the small
// pawn-equivalent jitter from positional differences in a 6-ply replay.
const SINGLE_CAPTURE_TOLERANCE = 1;

type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface VerboseMove {
  san: string;
  lan: string;
  color: Color;
  from: string;
  to: string;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: string;
  before: string;
  after: string;
}

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

function pieceValue(t: PieceSymbol): number {
  return PIECE_VALUE[t];
}

function pieceName(t: PieceSymbol): string {
  return PIECE_NAME[t];
}

function uciToInput(uci: string): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}

function replayLine(
  startFen: string,
  uciList: string[],
  maxPlies: number,
): { finalFen: string; moves: VerboseMove[] } {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return { finalFen: startFen, moves: [] };
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
  return { finalFen: chess.fen(), moves };
}

function countMaterial(fen: string): { w: number; b: number } {
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

function moverMargin(fen: string, mover: Color): number {
  const m = countMaterial(fen);
  return mover === 'w' ? m.w - m.b : m.b - m.w;
}

interface CaptureCandidate {
  piece: PieceSymbol;
  square: string;
  san: string;
  net: number;
}

// Walk a sequence of moves; return the largest single uncompensated capture
// made by `capturerColor`. A capture is "uncompensated" when the other side
// either does not recapture on the same square within RECAPTURE_LOOKAHEAD
// plies or recaptures with strictly less material.
function findUncompensatedCapture(
  moves: VerboseMove[],
  capturerColor: Color,
): CaptureCandidate | null {
  let best: CaptureCandidate | null = null;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color !== capturerColor || !m.captured) continue;
    let net = pieceValue(m.captured);
    for (let j = i + 1; j <= i + RECAPTURE_LOOKAHEAD && j < moves.length; j++) {
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

export interface ReviewInput {
  prevFen: string;
  prevEval: PositionEval | null;
  currEval: PositionEval | null;
  mover: Color;
  playedUci: string;
  category: Category;
}

export interface ReviewOutput {
  comment: string | null;
}

export function reviewMove(input: ReviewInput): ReviewOutput {
  const { prevFen, prevEval, currEval, mover, playedUci, category } = input;
  if (!prevEval || !currEval) return { comment: null };
  // Nothing to teach about a good move.
  if (category === 'best' || category === 'excellent' || category === 'good') {
    return { comment: null };
  }

  const sign = mover === 'w' ? 1 : -1;

  // M1: Missed mate. Mover had a forced mate, didn't play the engine's best move,
  // and is no longer mating.
  if (
    prevEval.mate !== undefined &&
    prevEval.mate * sign > 0 &&
    playedUci !== prevEval.bestMoveUci
  ) {
    const stillMate = currEval.mate !== undefined && currEval.mate * sign > 0;
    if (!stillMate) {
      return { comment: `Missed mate in ${Math.abs(prevEval.mate)}.` };
    }
  }

  // M2: Walked into mate. Mover wasn't being mated before; opponent now mates.
  const prevWasOpponentMate =
    prevEval.mate !== undefined && prevEval.mate * sign < 0;
  if (
    !prevWasOpponentMate &&
    currEval.mate !== undefined &&
    currEval.mate * sign < 0
  ) {
    return { comment: `Allows mate in ${Math.abs(currEval.mate)}.` };
  }

  // Sanity gate for the material detectors below: if the mover's win-%
  // didn't actually drop, don't fish for tactics.
  const beforeMover = sign * evalToCp(prevEval);
  const afterMover = sign * evalToCp(currEval);
  const winDrop = cpToWinPct(beforeMover) - cpToWinPct(afterMover);
  if (winDrop < MIN_WIN_PCT_DROP) return { comment: null };

  const bestReplay = replayLine(prevFen, prevEval.pv ?? [], REPLAY_PLIES);
  const playedReplay = replayLine(
    prevFen,
    [playedUci, ...(currEval.pv ?? [])],
    REPLAY_PLIES,
  );

  if (bestReplay.moves.length === 0 || playedReplay.moves.length === 0) {
    return { comment: null };
  }

  const bestMargin = moverMargin(bestReplay.finalFen, mover);
  const playedMargin = moverMargin(playedReplay.finalFen, mover);
  const lossVsBest = bestMargin - playedMargin;
  if (lossVsBest < MIN_MATERIAL_LOSS) return { comment: null };

  const opponent: Color = mover === 'w' ? 'b' : 'w';

  // G1: Missed gain — best line wins material via a single uncompensated
  // capture by the mover that the played line missed.
  const moverGain = findUncompensatedCapture(bestReplay.moves, mover);
  if (
    moverGain &&
    Math.abs(moverGain.net - lossVsBest) <= SINGLE_CAPTURE_TOLERANCE
  ) {
    const bestSan = bestReplay.moves[0]?.san;
    if (bestSan) {
      return {
        comment: `Missed ${bestSan} — wins the ${pieceName(moverGain.piece)} on ${moverGain.square}.`,
      };
    }
  }

  // L1: Hangs material — played line gives up material via a single
  // uncompensated capture by the opponent.
  const opponentGain = findUncompensatedCapture(playedReplay.moves, opponent);
  if (
    opponentGain &&
    Math.abs(opponentGain.net - lossVsBest) <= SINGLE_CAPTURE_TOLERANCE
  ) {
    return {
      comment: `Drops the ${pieceName(opponentGain.piece)} on ${opponentGain.square} to ${opponentGain.san}.`,
    };
  }

  return { comment: null };
}
