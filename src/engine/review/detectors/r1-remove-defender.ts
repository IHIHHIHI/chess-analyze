import { pieceValue } from '../helpers';
import type { Detector, VerboseMove } from '../types';

// R1 — "Removing the defender" two-move motif.
//
// Pattern (from the mover's perspective, walking ctx.bestReplay.moves):
//   Move 0 (mover): captures piece D at square d.
//   Move 1 (opponent): any reply (typically a recapture).
//   Move 2 (mover): captures piece T at square t, where t was defended by
//                   the piece originally on d (i.e. on prevBoard, square d
//                   was an attacker of t from the opponent's color).
// We require value(T) > value(D) and a clear net material gain (≥ 3) for
// the mover after netting any recapture at t in moves 3..5.
//
// We stay silent when:
//   - the played move itself captures T at t (transposition, not missed)
//   - the bestReplay doesn't follow the capture-then-capture shape
//   - the net gain is too small to be a clear missed tactic
//   - lossVsBest is way out of the right ballpark
export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;

  const { bestReplay, played, mover, opponent, prevBoard, lossVsBest, helpers } = ctx;
  const moves = bestReplay.moves;
  if (moves.length < 3) return null;

  const m0 = moves[0];
  const m2 = moves[2];

  // Both moves must be by the mover and must be captures.
  if (m0.color !== mover || m2.color !== mover) return null;
  if (!m0.captured || !m2.captured) return null;

  const d = m0.to;       // square where defender D was captured
  const t = m2.to;       // square of target T
  const D: VerboseMove = m0;
  const T: VerboseMove = m2;

  // Don't double-narrate: if the played move already captured the same
  // target square, this is a transposition, not a missed tactic.
  if (played.captured && played.to === t) return null;

  // d and t must be different squares (otherwise it's the same square
  // captured twice, which doesn't fit the motif).
  if (d === t) return null;

  // Was the piece on d a defender of t before any move was made?
  // I.e. on prevBoard, was square d in attackers(t, opponent)?
  const priorDefenders = helpers.attackersOf(prevBoard, t, opponent);
  if (!priorDefenders.includes(d)) return null;

  // Material accounting.
  const vd = pieceValue(D.captured!);
  const vt = pieceValue(T.captured!);
  // T must be strictly more valuable than D — otherwise it's not a
  // "remove the defender to win the bigger piece" motif.
  if (vt <= vd) return null;

  // Net the mover's gain across the whole 4–6 ply line:
  //   gain  = value(D) + value(T)
  //   loss  = value of any opponent piece the mover lost
  // We track every capture in the replay as a signed delta from the
  // mover's perspective. This handles the recapture-at-t case
  // (moves[3..]) correctly without special-casing it.
  let net = 0;
  for (const m of moves) {
    if (!m.captured) continue;
    const v = pieceValue(m.captured);
    net += m.color === mover ? v : -v;
  }

  // Require a clear material gain so we don't fire on dubious sacrifices.
  // 3 = "minor piece minimum"; the smallest meaningful R1 outcome (e.g.
  // capture a pawn defender, win a knight: net = 1 + 3 - 1 = 3 if
  // recaptured by pawn).
  if (net < 3) return null;

  // Sanity check vs the engine's own win-margin assessment: lossVsBest
  // should be at least roughly the size of net minus a small slop. This
  // suppresses cases where the bestReplay PV is misleadingly cut.
  if (lossVsBest < net - 1.5) return null;

  return {
    id: 'R1',
    comment:
      `Missed ${D.san} — removes the ${helpers.pieceName(D.captured!)} ` +
      `defender, then wins the ${helpers.pieceName(T.captured!)} on ${t}.`,
  };
};
