import {
  MIN_MATERIAL_LOSS,
  SINGLE_CAPTURE_TOLERANCE,
  findUncompensatedCapture,
} from '../helpers';
import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, bestReplay, mover, helpers } = ctx;
  if (lossVsBest < MIN_MATERIAL_LOSS) return null;

  const moverGain = findUncompensatedCapture(bestReplay.moves, mover);
  if (
    moverGain &&
    Math.abs(moverGain.net - lossVsBest) <= SINGLE_CAPTURE_TOLERANCE
  ) {
    const bestSan = bestReplay.moves[0]?.san;
    if (bestSan) {
      return {
        id: 'G1',
        comment: `Missed ${bestSan} — wins the ${helpers.pieceName(moverGain.piece)} on ${moverGain.square}.`,
      };
    }
  }
  return null;
};
