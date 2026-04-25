import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  const { prevEval, currEval, sign, playedUci } = ctx;
  if (
    prevEval.mate !== undefined &&
    prevEval.mate * sign > 0 &&
    playedUci !== prevEval.bestMoveUci
  ) {
    const stillMate = currEval.mate !== undefined && currEval.mate * sign > 0;
    if (!stillMate) {
      return { id: 'M1', comment: `Missed mate in ${Math.abs(prevEval.mate)}.` };
    }
  }
  return null;
};
