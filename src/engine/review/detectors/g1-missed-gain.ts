import {
  MIN_MATERIAL_LOSS,
  SINGLE_CAPTURE_TOLERANCE,
  findUncompensatedCapture,
  pieceValue,
} from '../helpers';
import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, bestReplay, mover, helpers, played } = ctx;
  if (lossVsBest < MIN_MATERIAL_LOSS) return null;

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
  return {
    id: 'G1',
    comment: `Missed ${bestSan} — wins the ${helpers.pieceName(moverGain.piece)} on ${moverGain.square}.`,
  };
};
