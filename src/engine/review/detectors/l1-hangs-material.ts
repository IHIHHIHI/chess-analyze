import {
  MIN_MATERIAL_LOSS,
  SINGLE_CAPTURE_TOLERANCE,
  findUncompensatedCapture,
} from '../helpers';
import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, playedReplay, opponent, helpers } = ctx;
  if (lossVsBest < MIN_MATERIAL_LOSS) return null;

  const opponentGain = findUncompensatedCapture(playedReplay.moves, opponent);
  if (
    opponentGain &&
    Math.abs(opponentGain.net - lossVsBest) <= SINGLE_CAPTURE_TOLERANCE
  ) {
    return {
      id: 'L1',
      comment: `Drops the ${helpers.pieceName(opponentGain.piece)} on ${opponentGain.square} to ${opponentGain.san}.`,
    };
  }
  return null;
};
