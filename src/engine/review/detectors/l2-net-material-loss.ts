import { MIN_WIN_PCT_DROP_POSITIONAL, netMaterialLoss } from '../helpers';
import type { Detector } from '../types';

// L2 — Net material loss across a multi-ply trade.
//
// Fires when the engine line ends with the mover materially behind, but no
// single uncompensated capture in the SINGLE_CAPTURE_TOLERANCE band lets G1 or
// L1 name the smoking gun. Examples from real-game audit:
//   - knight retreat allows gxf5 / exf5 / Bxc4+ — five-ply chain, no single
//     capture explains the full delta.
//   - king move into a tactical sequence dropping both rooks across plies.
//
// User feedback (2026-04-25): "by analyzing the engine line, you can easily
// see material difference after that. In that cases, you can just say that."
// L2 is the catch-all so positional fallbacks don't preempt material truth.
export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  const { lossVsBest, playedReplay, mover, winDrop } = ctx;

  // Require a real eval drop and a real material drop.
  if (winDrop < MIN_WIN_PCT_DROP_POSITIONAL) return null;
  if (lossVsBest < 1.5) return null;

  // The played line must actually contain captures — if there are none, the
  // loss is purely positional (compensation, time, structure) and PS is the
  // right tier to narrate it.
  const playedHasCaptures = playedReplay.moves.some((m) => m.captured);
  if (!playedHasCaptures) return null;

  const netLoss = netMaterialLoss(playedReplay.moves, mover);
  if (netLoss < 1.5) return null;

  // Round to a human-readable amount. We narrate in points (1 pawn = 1) so a
  // bishop loss reads as "3 points" and a rook as "5 points".
  const pts = Math.round(netLoss);

  // The first opponent reply in the played line is the move the player
  // needed to anticipate — name it so the comment is actionable.
  const firstOppMove = playedReplay.moves.find((m) => m.color !== mover);

  if (firstOppMove) {
    return {
      id: 'L2',
      comment:
        `Allows ${firstOppMove.san} — drops about ${pts} ` +
        `${pts === 1 ? 'point' : 'points'} of material in the resulting line.`,
    };
  }

  return {
    id: 'L2',
    comment: `Loses about ${pts} ${pts === 1 ? 'point' : 'points'} of material in the resulting line.`,
  };
};
