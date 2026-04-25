import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  const { prevEval, currEval, sign } = ctx;
  const prevWasOpponentMate =
    prevEval.mate !== undefined && prevEval.mate * sign < 0;
  if (
    !prevWasOpponentMate &&
    currEval.mate !== undefined &&
    currEval.mate * sign < 0
  ) {
    return { id: 'M2', comment: `Allows mate in ${Math.abs(currEval.mate)}.` };
  }
  return null;
};
