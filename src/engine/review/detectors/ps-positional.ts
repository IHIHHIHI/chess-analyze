import type { Chess } from 'chess.js';
import type { Color } from '../../../game/types';
import { MIN_WIN_PCT_DROP_POSITIONAL } from '../helpers';
import {
  fileChar,
  fileOf,
  kingSquare,
  rankOf,
  squareColorName,
  squareIsDark,
} from '../positional/king-zone';
import {
  backwardPawns,
  bishopsOf,
  fileLetterOf,
  holesIn,
  isolatedPawns,
  pawnsByFile,
  pawnsOnColor,
} from '../positional/pawn-structure';
import type { Detector, Finding, Square } from '../types';

// PS5 — Lost castling rights. Mover lost a castling right without castling.
function detectPS5(
  prevBoard: Chess,
  playedBoard: Chess,
  played: { from: Square; to: Square; piece: string; flags: string; color: Color },
  mover: Color,
): Finding | null {
  // If the played move *was* the castle itself, mover gained the king's
  // safety; that's not "gives up castling".
  if (played.flags.includes('k') || played.flags.includes('q')) return null;

  const prevRights = prevBoard.getCastlingRights(mover);
  const nowRights = playedBoard.getCastlingRights(mover);

  const lostKing = prevRights.k && !nowRights.k;
  const lostQueen = prevRights.q && !nowRights.q;
  if (!lostKing && !lostQueen) return null;

  // Mover hadn't castled yet — verify the king was on its home square in
  // prevBoard. If the king has already moved (and we still have the right?
  // chess.js wouldn't allow it, but defense-in-depth), bail out.
  const homeKing: Square = mover === 'w' ? 'e1' : 'e8';
  const prevKing = prevBoard.get(homeKing);
  if (!prevKing || prevKing.type !== 'k' || prevKing.color !== mover) {
    return null;
  }

  return {
    id: 'PS5',
    comment: 'Gives up castling — your king stays exposed.',
  };
}

// PS6 — Lost bishop pair.
//
// Mover's own move cannot reduce mover's bishop count in a single ply, so we
// inspect `playedReplay.finalBoard` — the position after the played line has
// played out (typically: mover's bishop trade, opponent's recapture). If
// after that line mover has ≤1 bishop while prev had two on opposite colors,
// the played move surrendered the pair.
function detectPS6(
  prevBoard: Chess,
  finalBoard: Chess,
  mover: Color,
): Finding | null {
  const prevBishops = bishopsOf(prevBoard, mover);
  if (prevBishops.length < 2) return null;
  const nowBishops = bishopsOf(finalBoard, mover);
  if (nowBishops.length >= 2) return null;

  // Were the prev bishops on opposite-colored squares?
  const darkCount = prevBishops.filter((sq) => squareIsDark(sq)).length;
  const lightCount = prevBishops.length - darkCount;
  if (darkCount < 1 || lightCount < 1) return null;

  return {
    id: 'PS6',
    comment: 'Surrenders the bishop pair.',
  };
}

// PS4 — Hole near our own king created by a pawn move.
function detectPS4(
  prevBoard: Chess,
  playedBoard: Chess,
  played: { piece: string },
  mover: Color,
): Finding | null {
  // Only pawn moves create irretrievable holes.
  if (played.piece !== 'p') return null;

  const king = kingSquare(playedBoard, mover);
  if (!king) return null;
  const kf = fileOf(king);
  const kr = rankOf(king);
  const prevHoles = new Set(holesIn(prevBoard, mover));
  const nowHoles = holesIn(playedBoard, mover);

  // Holes within strict king zone (Chebyshev ≤ 2). We deliberately do NOT
  // extend to distance 3 — every pawn move creates a hole somewhere
  // adjacent, and rank 4/5 holes "in front of" a back-rank king (which sit
  // at exactly Chebyshev 3) describe the entire centre of the board, not
  // just king safety. PS4's narrow brief is "fianchetto-style holes one
  // step in front of the king's pawn shield" — Chebyshev ≤ 2 captures that
  // and excludes generic rank-4 outposts that the played move would
  // otherwise accidentally create.
  //
  // We skip squares already occupied by any piece (including our own): a
  // "hole" is meaningful as an enemy outpost, which requires the square to
  // be empty in the post-played position.
  for (const h of nowHoles) {
    if (prevHoles.has(h)) continue;
    if (playedBoard.get(h)) continue;
    const dist = Math.max(
      Math.abs(fileOf(h) - kf),
      Math.abs(rankOf(h) - kr),
    );
    if (dist > 2) continue;
    const colorName = squareColorName(h);
    return {
      id: 'PS4',
      comment: `Weakens the ${colorName} squares around your king (hole on ${h}).`,
    };
  }
  return null;
}

// PS1 — Doubled pawns created by a pawn move.
function detectPS1(
  prevBoard: Chess,
  playedBoard: Chess,
  played: { piece: string; to: Square },
  mover: Color,
): Finding | null {
  if (played.piece !== 'p') return null;
  const toFile = fileOf(played.to);
  const prevByFile = pawnsByFile(prevBoard, mover);
  const nowByFile = pawnsByFile(playedBoard, mover);
  const prevCount = (prevByFile.get(toFile) ?? []).length;
  const nowCount = (nowByFile.get(toFile) ?? []).length;
  if (nowCount >= 2 && prevCount <= 1) {
    return {
      id: 'PS1',
      comment: `Doubles your pawns on the ${fileChar(toFile)}-file.`,
    };
  }
  return null;
}

// PS2 — Isolated pawn count INCREASED.
function detectPS2(
  prevBoard: Chess,
  playedBoard: Chess,
  mover: Color,
): Finding | null {
  const prevIso = new Set(isolatedPawns(prevBoard, mover));
  const nowIso = isolatedPawns(playedBoard, mover);
  if (nowIso.length <= prevIso.size) return null;
  // Prefer naming a NEW isolated pawn, otherwise the first one.
  const newOnes = nowIso.filter((sq) => !prevIso.has(sq));
  const target = newOnes[0] ?? nowIso[0];
  return {
    id: 'PS2',
    comment: `Isolates your ${fileLetterOf(target)}-pawn.`,
  };
}

// PS3 — Backward pawn count INCREASED.
function detectPS3(
  prevBoard: Chess,
  playedBoard: Chess,
  mover: Color,
): Finding | null {
  const prevBack = new Set(backwardPawns(prevBoard, mover));
  const nowBack = backwardPawns(playedBoard, mover);
  if (nowBack.length <= prevBack.size) return null;
  const newOnes = nowBack.filter((sq) => !prevBack.has(sq));
  const target = newOnes[0] ?? nowBack[0];
  return {
    id: 'PS3',
    comment: `Leaves your ${target}-pawn backward.`,
  };
}

// PS7 — Bad bishop: a mover bishop on the color of ≥4 of our own pawns,
// while prev didn't have this state for any of our bishops.
function detectPS7(
  prevBoard: Chess,
  playedBoard: Chess,
  mover: Color,
): Finding | null {
  const wasBad = (board: Chess): boolean => {
    const bishops = bishopsOf(board, mover);
    for (const b of bishops) {
      const dark = squareIsDark(b);
      const samePawns = pawnsOnColor(board, mover, dark);
      if (samePawns >= 4) return true;
    }
    return false;
  };
  if (!wasBad(playedBoard)) return null;
  if (wasBad(prevBoard)) return null;
  return {
    id: 'PS7',
    comment: 'Locks your bishop behind its own pawns.',
  };
}

export const detector: Detector = (ctx) => {
  if (ctx.kind !== 'full') return null;
  if (ctx.winDrop < MIN_WIN_PCT_DROP_POSITIONAL) return null;

  const { prevBoard, playedBoard, played, mover, playedReplay } = ctx;

  // Sub-pipeline (priority order: PS5 → PS6 → PS4 → PS1 → PS2 → PS3 → PS7).
  const ps5 = detectPS5(prevBoard, playedBoard, played, mover);
  if (ps5) return ps5;

  const ps6 = detectPS6(prevBoard, playedReplay.finalBoard, mover);
  if (ps6) return ps6;

  const ps4 = detectPS4(prevBoard, playedBoard, played, mover);
  if (ps4) return ps4;

  const ps1 = detectPS1(prevBoard, playedBoard, played, mover);
  if (ps1) return ps1;

  const ps2 = detectPS2(prevBoard, playedBoard, mover);
  if (ps2) return ps2;

  const ps3 = detectPS3(prevBoard, playedBoard, mover);
  if (ps3) return ps3;

  const ps7 = detectPS7(prevBoard, playedBoard, mover);
  if (ps7) return ps7;

  return null;
};
