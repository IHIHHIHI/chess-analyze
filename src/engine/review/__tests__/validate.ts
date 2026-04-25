import { Chess } from 'chess.js';
import type { Fixture, FixtureExpectation } from '../types';

function uciToInput(
  uci: string,
): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}

function tryMove(
  chess: Chess,
  uci: string,
  context: string,
): void {
  const input = uciToInput(uci);
  if (!input) throw new Error(`${context}: malformed UCI ${uci}`);
  let m;
  try {
    m = chess.move(input);
  } catch (e) {
    throw new Error(`${context}: illegal UCI ${uci} (${(e as Error).message})`);
  }
  if (!m) throw new Error(`${context}: illegal UCI ${uci}`);
}

export function validateFixture(f: Fixture): void {
  // 1. FEN parses.
  const fenCheck = new Chess();
  try {
    fenCheck.load(f.prevFen);
  } catch (e) {
    throw new Error(`Fixture "${f.name}": invalid FEN — ${(e as Error).message}`);
  }

  // 2. bestMoveUci matches first PV element when PV is non-empty.
  if (
    f.prevEval.pv.length > 0 &&
    f.prevEval.bestMoveUci !== f.prevEval.pv[0]
  ) {
    throw new Error(
      `Fixture "${f.name}": prevEval.bestMoveUci (${f.prevEval.bestMoveUci}) ` +
        `does not match prevEval.pv[0] (${f.prevEval.pv[0]})`,
    );
  }

  // 3. Replay best PV from prev FEN.
  if (f.prevEval.pv.length > 0) {
    const best = new Chess();
    best.load(f.prevFen);
    for (let i = 0; i < f.prevEval.pv.length; i++) {
      tryMove(best, f.prevEval.pv[i], `Fixture "${f.name}" prevEval.pv[${i}]`);
    }
  }

  // 4. Replay played + currEval.pv from prev FEN.
  const played = new Chess();
  played.load(f.prevFen);
  tryMove(played, f.playedUci, `Fixture "${f.name}" playedUci`);
  for (let i = 0; i < f.currEval.pv.length; i++) {
    tryMove(played, f.currEval.pv[i], `Fixture "${f.name}" currEval.pv[${i}]`);
  }
}

export function commentMatches(
  actual: string | null,
  expected: FixtureExpectation,
): boolean {
  if ('comment' in expected) {
    return actual === expected.comment;
  }

  const lower = actual === null ? null : actual.toLowerCase();
  const includes = 'commentContains' in expected ? expected.commentContains : null;
  const excludes = 'commentNotContains' in expected ? expected.commentNotContains : null;

  if (includes && includes.length > 0) {
    if (lower === null) return false;
    if (!includes.every((s) => lower.includes(s.toLowerCase()))) return false;
  }
  if (excludes && excludes.length > 0) {
    // null comment satisfies notContains trivially.
    if (lower !== null && excludes.some((s) => lower.includes(s.toLowerCase()))) {
      return false;
    }
  }
  return true;
}
