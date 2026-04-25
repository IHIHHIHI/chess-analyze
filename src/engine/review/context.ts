import { Chess } from 'chess.js';
import { cpToWinPct, evalToCp } from '../classify';
import {
  MIN_WIN_PCT_DROP,
  REPLAY_PLIES,
  cloneBoard,
  helpers,
  moverMargin,
  replayLine,
  uciToInput,
} from './helpers';
import type {
  DetectorContext,
  MateOnlyContext,
  ReviewInput,
  VerboseMove,
} from './types';

export function buildContext(input: ReviewInput): DetectorContext | null {
  const { prevFen, prevEval, currEval, mover, playedUci, category } = input;

  if (!prevEval || !currEval) return null;

  const sign: 1 | -1 = mover === 'w' ? 1 : -1;
  const opponent = mover === 'w' ? 'b' : 'w';

  const playedInput = uciToInput(playedUci);
  if (!playedInput) return null;

  // Parse the played move on a throwaway copy so we keep prevBoard pristine.
  const probe = new Chess();
  try {
    probe.load(prevFen);
  } catch {
    return null;
  }

  let played: VerboseMove;
  try {
    const m = probe.move(playedInput);
    if (!m) return null;
    played = m as unknown as VerboseMove;
  } catch {
    return null;
  }

  const beforeMover = sign * evalToCp(prevEval);
  const afterMover = sign * evalToCp(currEval);
  const winDrop = cpToWinPct(beforeMover) - cpToWinPct(afterMover);

  const mateOnly: MateOnlyContext = {
    kind: 'mate-only',
    prevEval, currEval, mover, opponent, sign,
    played, playedUci, category,
  };

  // Below the win-drop floor, only the mate detectors can fire.
  if (winDrop < MIN_WIN_PCT_DROP) return mateOnly;

  // Build replays. If either is empty (e.g., engine returned no PV) fall
  // back to mate-only — no point doing material reasoning over no plies.
  const bestReplay = replayLine(prevFen, prevEval.pv ?? [], REPLAY_PLIES);
  const playedReplay = replayLine(
    prevFen,
    [playedUci, ...(currEval.pv ?? [])],
    REPLAY_PLIES,
  );
  if (bestReplay.moves.length === 0 || playedReplay.moves.length === 0) {
    return mateOnly;
  }

  // Materialize the three single-ply boards. Errors here shouldn't happen
  // because we already proved the FEN+playedUci+best PV[0] are legal, but
  // we still degrade gracefully on any chess.js mishap.
  let prevBoard: Chess;
  try {
    prevBoard = new Chess();
    prevBoard.load(prevFen);
  } catch {
    return mateOnly;
  }

  const playedBoard = cloneBoard(prevBoard);
  if (!playedBoard.move(playedInput)) return mateOnly;

  const bestUciInput = uciToInput(prevEval.pv?.[0] ?? '');
  if (!bestUciInput) return mateOnly;
  const bestBoard = cloneBoard(prevBoard);
  if (!bestBoard.move(bestUciInput)) return mateOnly;

  const lossVsBest =
    moverMargin(bestReplay.finalFen, mover) -
    moverMargin(playedReplay.finalFen, mover);

  return {
    kind: 'full',
    prevEval, currEval, mover, opponent, sign,
    played, playedUci, category,
    prevFen,
    prevBoard,
    playedBoard,
    bestBoard,
    bestReplay,
    playedReplay,
    winDrop,
    lossVsBest,
    helpers,
  };
}
