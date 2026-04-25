import type { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import type { Detector, PieceSymbol, Square } from '../types';

// File/rank arithmetic: 'a'..'h' -> 0..7, '1'..'8' -> 0..7.
function fileOf(sq: Square): number {
  return sq.charCodeAt(0) - 97; // 'a' = 97
}

function rankOf(sq: Square): number {
  return sq.charCodeAt(1) - 49; // '1' = 49
}

function squareAt(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return (String.fromCharCode(97 + file) + String.fromCharCode(49 + rank)) as Square;
}

// Unit step from `from` toward `to` if they are aligned on a rook or bishop
// line. Returns null if not aligned (e.g., knight relation).
function lineStep(
  from: Square,
  to: Square,
): { df: number; dr: number } | null {
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (df === 0 && dr === 0) return null;
  if (df === 0) return { df: 0, dr: dr > 0 ? 1 : -1 };
  if (dr === 0) return { df: df > 0 ? 1 : -1, dr: 0 };
  if (Math.abs(df) === Math.abs(dr)) {
    return { df: df > 0 ? 1 : -1, dr: dr > 0 ? 1 : -1 };
  }
  return null;
}

// Walk one step at a time from `from` toward (and past) `through`, returning
// the first occupied square strictly past `through`. Stops at board edge.
function firstPieceBeyond(
  board: Chess,
  from: Square,
  through: Square,
): Square | null {
  const step = lineStep(from, through);
  if (!step) return null;
  let f = fileOf(through) + step.df;
  let r = rankOf(through) + step.dr;
  while (true) {
    const sq = squareAt(f, r);
    if (!sq) return null;
    if (board.get(sq)) return sq;
    f += step.df;
    r += step.dr;
  }
}

// Whether the slider type matches the line direction (bishop = diagonal,
// rook = orthogonal, queen = both).
function sliderMatchesLine(
  type: PieceSymbol,
  step: { df: number; dr: number },
): boolean {
  const diagonal = step.df !== 0 && step.dr !== 0;
  if (type === 'q') return true;
  if (type === 'b') return diagonal;
  if (type === 'r') return !diagonal;
  return false;
}

interface PinInfo {
  pinned: { piece: PieceSymbol; square: Square };
  anchor: { piece: PieceSymbol; square: Square };
  slider: { piece: PieceSymbol; square: Square };
}

// Find every pin where a `mover`-color slider pins an `opponent` piece against
// a more-valuable opponent piece (king or higher-value piece).
function findPins(
  board: Chess,
  mover: Color,
  opponent: Color,
  helpers: { pieceValue: (t: PieceSymbol) => number },
): PinInfo[] {
  const pins: PinInfo[] = [];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  for (const f of files) {
    for (const r of ranks) {
      const sq = (f + r) as Square;
      const piece = board.get(sq);
      // Candidate pinned piece: enemy, non-pawn, non-king, value >= 3.
      if (!piece) continue;
      if (piece.color !== opponent) continue;
      if (piece.type === 'p' || piece.type === 'k') continue;
      if (helpers.pieceValue(piece.type) < 3) continue;

      // For each mover-color attacker of this square that is a slider
      // aligned to the (slider -> target) line, look past the target.
      const attackers = board.attackers(sq, mover);
      for (const aSq of attackers) {
        const att = board.get(aSq);
        if (!att) continue;
        if (att.type !== 'b' && att.type !== 'r' && att.type !== 'q') continue;
        const step = lineStep(aSq, sq);
        if (!step) continue;
        if (!sliderMatchesLine(att.type, step)) continue;

        const beyondSq = firstPieceBeyond(board, aSq, sq);
        if (!beyondSq) continue;
        const beyond = board.get(beyondSq);
        if (!beyond) continue;
        if (beyond.color !== opponent) continue;
        // Anchor must be more valuable (king is highest by helpers value
        // table, so it always qualifies).
        if (helpers.pieceValue(beyond.type) <= helpers.pieceValue(piece.type)) {
          continue;
        }

        pins.push({
          pinned: { piece: piece.type, square: sq },
          anchor: { piece: beyond.type, square: beyondSq },
          slider: { piece: att.type, square: aSq },
        });
      }
    }
  }
  return pins;
}

function pinKey(p: PinInfo): string {
  return `${p.pinned.square}|${p.anchor.square}`;
}

// Sort key: prefer pin to king > queen > rook > anything else, ties broken
// by higher pinned-piece value.
function pinPriority(p: PinInfo, pieceValue: (t: PieceSymbol) => number): number {
  const anchorRank =
    p.anchor.piece === 'k' ? 1000 : pieceValue(p.anchor.piece);
  return anchorRank * 10 + pieceValue(p.pinned.piece);
}

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { bestBoard, prevBoard, bestReplay, mover, opponent, helpers } = ctx;

  // The engine's first move must exist (we have a 'full' context, so it does).
  const bestMove = bestReplay.moves[0];
  if (!bestMove) return null;

  // If the engine's best move is itself a direct capture, that's G1's job —
  // a pin is the wrong frame to narrate "...wins the rook".
  if (bestMove.captured) return null;

  const newPins = findPins(bestBoard, mover, opponent, helpers);
  if (newPins.length === 0) return null;

  const oldPinKeys = new Set(
    findPins(prevBoard, mover, opponent, helpers).map(pinKey),
  );

  const created = newPins.filter((p) => !oldPinKeys.has(pinKey(p)));
  if (created.length === 0) return null;

  // Pick the pin with the highest-priority anchor (king > queen > rook ...).
  created.sort(
    (a, b) => pinPriority(b, helpers.pieceValue) - pinPriority(a, helpers.pieceValue),
  );
  const top = created[0];

  const pinnedName = helpers.pieceName(top.pinned.piece);
  const anchorClause =
    top.anchor.piece === 'k'
      ? 'to the king'
      : `to the ${helpers.pieceName(top.anchor.piece)} on ${top.anchor.square}`;

  return {
    id: 'P1',
    comment: `Missed ${bestMove.san} — pins the ${pinnedName} on ${top.pinned.square} ${anchorClause}.`,
  };
};
