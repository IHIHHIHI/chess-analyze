import {
  MIN_MATERIAL_LOSS,
  SINGLE_CAPTURE_TOLERANCE,
  findUncompensatedCapture,
  netMaterialLoss,
} from '../helpers';
import type { Detector } from '../types';

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, playedReplay, opponent, mover, helpers } = ctx;
  if (lossVsBest < MIN_MATERIAL_LOSS) return null;

  // Sanity: played line must actually NET material loss for mover. Mirror
  // of G1's guard — without this, recapture-of-prior-loss patterns can
  // be misnarrated as a hang.
  const lineNetLoss = netMaterialLoss(playedReplay.moves, mover);
  if (lineNetLoss < MIN_MATERIAL_LOSS) return null;

  const opponentGain = findUncompensatedCapture(playedReplay.moves, opponent);
  if (
    !opponentGain ||
    Math.abs(opponentGain.net - lossVsBest) > SINGLE_CAPTURE_TOLERANCE
  ) {
    return null;
  }

  const pieceName = helpers.pieceName(opponentGain.piece);
  const square = opponentGain.square;

  // Single-ply hang: the opponent's first reply IS the capture.
  // Use the original "Drops the X on Y to SAN." phrasing.
  if (opponentGain.moveIndex === 1) {
    return {
      id: 'L1',
      comment: `Drops the ${pieceName} on ${square} to ${opponentGain.san}.`,
    };
  }

  // Multi-ply tactic: the harvest comes several plies later. Quote the
  // FIRST opponent move (the threat the player needed to see) instead of
  // the harvest move buried in the line. Real-game investigation showed
  // "Drops the rook on a1 to Nxa1" was misleading — the move the player
  // needed to anticipate was Nxc2+ four plies earlier.
  const threat = playedReplay.moves[1];
  if (!threat) {
    return {
      id: 'L1',
      comment: `Drops the ${pieceName} on ${square} to ${opponentGain.san}.`,
    };
  }
  return {
    id: 'L1',
    comment: `Allows ${threat.san} — wins the ${pieceName} on ${square}.`,
  };
};
