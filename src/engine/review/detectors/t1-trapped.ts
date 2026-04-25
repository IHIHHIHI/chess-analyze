import type { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import type { Detector, DetectorHelpers, PieceSymbol, Square, VerboseMove } from '../types';

// Lowest piece value among the squares list. Returns Infinity if list is
// empty so callers can compare without special-casing.
function lowestValue(
  board: Chess,
  squares: Square[],
  helpers: DetectorHelpers,
): number {
  let min = Infinity;
  for (const sq of squares) {
    const p = board.get(sq);
    if (!p) continue;
    const v = helpers.pieceValue(p.type as PieceSymbol);
    if (v < min) min = v;
  }
  return min;
}

// "Safe escape": after a tentative move of the trapped piece to `m.to`,
// the destination square is not under net attack.
//
// The naive "attackers ≤ defenders" rule misfires when the only defender
// is a heavier piece than the cheapest attacker (e.g. a queen "defending"
// a square attacked by a pawn — the queen can't actually take the pawn
// without losing material). So we require that the lowest-value defender
// be no heavier than the lowest-value attacker.
//
// Captures of equal-or-greater value also qualify (good trade).
function isSafeEscape(
  moverColor: Color,
  pieceValue: number,
  m: VerboseMove,
  newBoard: Chess,
  helpers: DetectorHelpers,
): boolean {
  const capturedValue = m.captured ? helpers.pieceValue(m.captured) : 0;
  const attackers = helpers.attackersOf(newBoard, m.to, moverColor);
  if (attackers.length === 0) return true;
  const defenders = helpers.defendersOf(newBoard, m.to);
  if (attackers.length <= defenders.length) {
    const lowAtt = lowestValue(newBoard, attackers, helpers);
    const lowDef = lowestValue(newBoard, defenders, helpers);
    if (lowDef <= lowAtt) return true;
  }
  // Hanging on the destination — only safe if the capture pays for the loss.
  return capturedValue >= pieceValue;
}

// Returns true if piece at `sq` (color = piece.color) is trapped on `board`.
// Trapped = attacked by `attackerColor` AND every legal move leaves it
// on a square with insufficient defenders (no safe escape).
//
// Caller must ensure `board.turn() === piece.color` so .moves({square}) is
// meaningful — this is true on `bestBoard` for opponent pieces, and for
// `prevBoard` we flip turn explicitly via setTurn before calling.
function isPieceTrapped(
  board: Chess,
  sq: Square,
  attackerColor: Color,
  helpers: DetectorHelpers,
): boolean {
  const piece = board.get(sq);
  if (!piece) return false;
  if (helpers.attackersOf(board, sq, attackerColor).length === 0) return false;

  let moves: VerboseMove[];
  try {
    moves = board.moves({ verbose: true, square: sq }) as unknown as VerboseMove[];
  } catch {
    return false;
  }
  // If the piece has zero legal moves it's typically pinned (or in a
  // checkmate/stalemate edge case). Let P1/M1/M2 handle those — T1 should
  // only fire when there's something to refute by safe-square enumeration.
  if (moves.length === 0) return false;
  const pieceVal = helpers.pieceValue(piece.type as PieceSymbol);
  for (const m of moves) {
    const probe = helpers.cloneBoard(board);
    try {
      const made = probe.move({ from: m.from, to: m.to, promotion: m.promotion });
      if (!made) continue;
    } catch {
      continue;
    }
    if (isSafeEscape(attackerColor, pieceVal, m, probe, helpers)) {
      return false;
    }
  }
  return true;
}

// Whether the piece on `sq` was already trapped on `prevBoard`. To enumerate
// escapes we need it to be the piece's owner's turn — flip via setTurn,
// which can fail if it would leave their king in check; in that case we
// conservatively treat it as already-trapped (so we don't fire).
function wasPieceTrappedOnPrevBoard(
  prevBoard: Chess,
  sq: Square,
  attackerColor: Color,
  helpers: DetectorHelpers,
): boolean {
  const probe = helpers.cloneBoard(prevBoard);
  const piece = probe.get(sq);
  if (!piece) return false;
  if (probe.turn() !== piece.color) {
    if (!probe.setTurn(piece.color)) {
      return true;
    }
  }
  return isPieceTrapped(probe, sq, attackerColor, helpers);
}

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { mover, opponent, bestBoard, prevBoard, bestReplay, helpers } = ctx;

  // Don't fire when the engine's first move is itself a direct capture —
  // that's G1's territory.
  const bestMove = bestReplay.moves[0];
  if (!bestMove) return null;
  if (bestMove.captured) return null;

  // Walk every enemy piece on bestBoard.
  const squares = bestBoard.board();
  for (const row of squares) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color !== opponent) continue;
      const type = cell.type as PieceSymbol;
      // Skip kings (own detectors) and pawns (value < 3).
      if (type === 'k' || type === 'p') continue;
      const value = helpers.pieceValue(type);
      if (value < 3) continue;

      const sq = cell.square as Square;
      if (!isPieceTrapped(bestBoard, sq, mover, helpers)) continue;

      // Verify the trap is NEW.
      if (wasPieceTrappedOnPrevBoard(prevBoard, sq, mover, helpers)) continue;

      const bestSan = bestMove.san;
      return {
        id: 'T1',
        comment: `Missed ${bestSan} — traps the ${helpers.pieceName(type)} on ${sq}.`,
      };
    }
  }
  return null;
};
