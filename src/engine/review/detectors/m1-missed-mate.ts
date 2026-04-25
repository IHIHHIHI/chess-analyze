import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  const { prevEval, currEval, sign, playedUci, played } = ctx;

  // If the played move IS itself checkmate, the player didn't miss anything —
  // they delivered a (different) mate. Real-game audit case: prev was mate-1
  // via Qge8#; player chose Qg8# instead. Both mate; M1's "Missed mate in 1"
  // is a false positive. SAN convention: '#' = checkmate.
  if (played.san.endsWith('#')) return null;

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
