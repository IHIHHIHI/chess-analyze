import type { Detector, PieceSymbol, Square } from '../types';

interface ForkTarget {
  square: Square;
  type: PieceSymbol;
  value: number;
}

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { bestBoard, bestReplay, mover, helpers, lossVsBest } = ctx;

  const moved = bestReplay.moves[0];
  if (!moved) return null;

  // G1 already narrates direct captures by the engine's first move.
  // Only fire F1 when the engine creates two threats without grabbing
  // anything itself — keeps the two detectors decoupled.
  if (moved.captured) return null;

  // The fork must actually win material. Real-game audit (2026-04-25)
  // showed F1 firing on geometric forks where the engine line netted 0
  // material because the second target was a pawn the queen calmly
  // sidestepped from. Require a real material delta, same gate as G1/L1.
  if (lossVsBest < 1.5) return null;

  const attackerSq = moved.to;
  const attackerType = moved.piece;
  const attackerValue = helpers.pieceValue(attackerType);

  // Find every enemy piece on bestBoard that the moved piece itself attacks.
  const targets: ForkTarget[] = [];
  let kingTarget: ForkTarget | null = null;
  const rows = bestBoard.board();
  for (const row of rows) {
    for (const cell of row) {
      if (!cell || cell.color === mover) continue;
      const attackers = helpers.attackersOf(bestBoard, cell.square, mover);
      if (!attackers.includes(attackerSq)) continue;
      const target: ForkTarget = {
        square: cell.square,
        type: cell.type,
        value: helpers.pieceValue(cell.type),
      };
      if (cell.type === 'k') {
        kingTarget = target;
      } else {
        targets.push(target);
      }
    }
  }

  // King-only attack is plain check, not a fork.
  if (kingTarget && targets.length === 0) return null;

  const bestSan = moved.san;
  if (!bestSan) return null;

  // Royal fork: king + at least one other piece worth ≥ 3. Real-game audit
  // (2026-04-25) showed F1 was firing on geometric "royal forks" of king +
  // a pawn that the engine never actually grabbed; require the second
  // target be a minor piece or better.
  if (kingTarget && targets.length >= 1) {
    targets.sort((a, b) => b.value - a.value);
    const other = targets[0];
    if (other.value < 3) return null;
    return {
      id: 'F1',
      comment:
        `Missed ${bestSan} — royal fork: ` +
        `the king on ${kingTarget.square} and the ` +
        `${helpers.pieceName(other.type)} on ${other.square}.`,
    };
  }

  // Non-royal fork: need ≥2 targets, BOTH worth ≥ 3 (minor piece minimum).
  // A rook attacking "queen + pawn" isn't a meaningful fork — the queen
  // calmly retreats and the pawn is never captured. Same audit motivation.
  if (targets.length < 2) return null;
  targets.sort((a, b) => b.value - a.value);
  if (targets[1].value < 3) return null;
  const topTwo = targets[0].value + targets[1].value;
  if (topTwo <= attackerValue) return null;

  const t1 = targets[0];
  const t2 = targets[1];
  return {
    id: 'F1',
    comment:
      `Missed ${bestSan} — forks the ${helpers.pieceName(t1.type)} on ${t1.square} ` +
      `and the ${helpers.pieceName(t2.type)} on ${t2.square}.`,
  };
};
