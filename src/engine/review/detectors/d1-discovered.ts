import { SQUARES } from 'chess.js';
import type { Detector, PieceSymbol, Square } from '../types';

// D1 — Discovered attack / discovered check.
//
// We compare attacker sets on each enemy square before vs. after the engine's
// best move. A "discovered" attacker is one that appears post-move and is NOT
// the moved piece itself (its destination square). Discovered check (target =
// king) takes priority over plain discovered attacks; among non-king targets
// we pick the most valuable, and require value ≥ 3 so we don't narrate a
// discovered attack on a pawn.
//
// We deliberately defer to G1 when the engine's best move is itself a capture
// of comparable or greater value — those are dominated by the direct gain,
// and saying "discovered attack" would mis-explain what's really going on.
export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { bestReplay, prevBoard, bestBoard, mover, helpers } = ctx;
  const first = bestReplay.moves[0];
  if (!first) return null;

  const movedTo = first.to;

  // Walk every enemy square; collect new attackers that weren't there before
  // and aren't the moved piece itself.
  let kingTarget: { sq: Square; attacker: Square; attackerPiece: PieceSymbol } | null = null;
  let bestNonKing: {
    sq: Square;
    piece: PieceSymbol;
    value: number;
    attacker: Square;
    attackerPiece: PieceSymbol;
  } | null = null;

  for (const sq of SQUARES) {
    const enemy = bestBoard.get(sq);
    if (!enemy || enemy.color === mover) continue;

    const prevAttackers = new Set(helpers.attackersOf(prevBoard, sq, mover));
    const newAttackers = helpers.attackersOf(bestBoard, sq, mover);

    const discovered: Square[] = [];
    for (const a of newAttackers) {
      if (a === movedTo) continue; // moved piece's own attack, not a discovery
      if (prevAttackers.has(a)) continue;
      discovered.push(a);
    }
    if (discovered.length === 0) continue;

    // Pick the first discovered attacker as the "revealing" piece. (If two
    // pieces both line up, one comment suffices.)
    const attackerSq = discovered[0];
    const attackerPiece = bestBoard.get(attackerSq);
    if (!attackerPiece) continue;

    if (enemy.type === 'k') {
      // Discovered check beats any non-king target; remember and keep going
      // only to confirm — we'll prefer this regardless.
      kingTarget = {
        sq,
        attacker: attackerSq,
        attackerPiece: attackerPiece.type,
      };
      continue;
    }

    const value = helpers.pieceValue(enemy.type);
    if (value < 3) continue; // ignore discovered attacks on pawns
    if (!bestNonKing || value > bestNonKing.value) {
      bestNonKing = {
        sq,
        piece: enemy.type,
        value,
        attacker: attackerSq,
        attackerPiece: attackerPiece.type,
      };
    }
  }

  if (!kingTarget && !bestNonKing) return null;

  // Defer to G1 when the engine's first move is itself a capture whose value
  // dominates the discovered target. Discovery is incidental in those lines.
  if (first.captured) {
    const directGain = helpers.pieceValue(first.captured);
    const discoveredValue = kingTarget ? 100 : (bestNonKing?.value ?? 0);
    if (directGain >= discoveredValue) return null;
  }

  const san = first.san;
  if (kingTarget) {
    const attackerName = helpers.pieceName(kingTarget.attackerPiece);
    return {
      id: 'D1',
      comment: `Missed ${san} — discovered check; ${attackerName} hits the king.`,
    };
  }

  // bestNonKing is non-null here.
  const t = bestNonKing!;
  return {
    id: 'D1',
    comment: `Missed ${san} — discovered attack on the ${helpers.pieceName(t.piece)} on ${t.sq}.`,
  };
};
