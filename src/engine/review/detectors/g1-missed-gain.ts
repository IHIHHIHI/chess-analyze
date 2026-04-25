import {
  MIN_MATERIAL_LOSS,
  SINGLE_CAPTURE_TOLERANCE,
  findUncompensatedCapture,
  netMaterialLoss,
  pieceValue,
} from '../helpers';
import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, bestReplay, mover, helpers, played } = ctx;
  if (lossVsBest < MIN_MATERIAL_LOSS) return null;

  // Sanity: best line must actually NET material for mover. Real-game audit
  // (MagnusCarlsen ply 57) had findUncompensatedCapture flag a +3 capture
  // that came AFTER the mover already gave up a -3 piece in the same line
  // (Qf4 Bxc3 Nxc3 ...). The recapture is real but not a net gain. Without
  // this guard G1 fires "Missed Qf4 — wins the bishop on c3" which is
  // misleading. Net loss across line must be ≤ -1.5 (mover gained ≥ 1.5).
  const lineNetLoss = netMaterialLoss(bestReplay.moves, mover);
  if (lineNetLoss > -MIN_MATERIAL_LOSS) return null;

  const moverGain = findUncompensatedCapture(bestReplay.moves, mover);
  if (
    !moverGain ||
    Math.abs(moverGain.net - lossVsBest) > SINGLE_CAPTURE_TOLERANCE
  ) {
    return null;
  }

  // Don't fire when the played move ALSO captured this same piece — the
  // player did win the material; G1 would mis-imply they missed it. Real
  // example from audit: white played Qxc2 (queen takes knight); engine
  // preferred Bxc2 (bishop takes knight) for placement. Both win the same
  // knight; the difference is recapture choice, not material miss.
  if (
    played.captured &&
    played.to === moverGain.square &&
    pieceValue(played.captured) >= moverGain.net
  ) {
    return null;
  }

  const bestSan = bestReplay.moves[0]?.san;
  if (!bestSan) return null;
  const pieceName = helpers.pieceName(moverGain.piece);
  const square = moverGain.square;

  // When the engine's first move IS the capture (moveIndex 0), the existing
  // phrasing is precise: "Missed Bxc6 — wins the knight on c6." But when the
  // capture happens later in the PV, the recommended move is a quiet
  // improvement (outpost, repositioning) and the win is a setup payoff.
  // The flat "wins the pawn on h7" phrasing reads as "Ng6 attacks h7"
  // (it doesn't). Real-game audit (2026-04-25) flagged 4 such cases.
  if (moverGain.moveIndex >= 2) {
    return {
      id: 'G1',
      comment: `Missed ${bestSan} — the line wins the ${pieceName} on ${square}.`,
    };
  }

  return {
    id: 'G1',
    comment: `Missed ${bestSan} — wins the ${pieceName} on ${square}.`,
  };
};
