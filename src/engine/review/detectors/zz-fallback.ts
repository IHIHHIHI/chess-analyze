import { Chess } from 'chess.js';
import { uciToInput } from '../helpers';
import type { Detector, VerboseMove } from '../types';

// ZZ — Generic catch-all detector. Runs LAST in the pipeline.
//
// User policy (2026-04-25): every move classified as inaccuracy / mistake /
// blunder must carry SOME comment. Silence is worse than a generic remark,
// because the user expects coverage on every flagged move.
//
// If we reach this detector, no specific tactical / material / positional
// detector matched the move. We fall back to naming the engine's preferred
// move. The user can then compare what they played to what the engine
// recommends, even without an explanation of the structural difference.
//
// Wording is intentionally short to avoid drowning the move list. We
// quote in SAN form (familiar from PGN) rather than UCI (engine internal).
export const detector: Detector = (ctx) => {
  let bestSan: string | null = null;

  // Full context: we already replayed the best line, take the SAN of move 0.
  if (ctx.kind === 'full' && ctx.bestReplay.moves[0]?.san) {
    bestSan = ctx.bestReplay.moves[0].san;
  } else if (ctx.prevEval.bestMoveUci) {
    // Mate-only or PV-empty path: compute SAN by replaying the best UCI on
    // the prev position. ctx.played.before is the FEN that existed before
    // the player's move (== prevFen), so applying the engine's best UCI
    // there gives us the move it would have played.
    const board = new Chess();
    try {
      board.load(ctx.played.before);
      const input = uciToInput(ctx.prevEval.bestMoveUci);
      if (input) {
        const m = board.move(input);
        if (m) bestSan = (m as unknown as VerboseMove).san;
      }
    } catch {
      // Fall through; SAN unavailable. We'll return null which means
      // silence — only happens if engine output is malformed.
    }
  }

  if (!bestSan) return null;

  return {
    id: 'ZZ',
    comment: `Better was ${bestSan}.`,
  };
};
