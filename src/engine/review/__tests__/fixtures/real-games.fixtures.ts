import type { Fixture } from '../../types';

// Fixtures derived from real chess.com games of user IHIHHIHI, found by an
// investigation subagent that ran Stockfish at depth 14 and audited every
// non-null comment for accuracy (2026-04-25).
//
// These lock in the post-fix behavior:
//   - L1 multi-ply: "Allows {threatSan} — wins the {piece} on {sq}"
//   - L2: net material loss when no single capture explains it
//   - F1/S1: lossVsBest gate suppresses geometric-but-not-winning forks/skewers
export const realGameFixtures: Fixture[] = [
  // L1 multi-ply: Nge2?? — black plays Nxc2+ (the threat) winning the rook on a1
  // four plies later. Pre-fix message named the harvest (Nxa1); post-fix
  // names the threat the player needed to anticipate.
  {
    name: 'Real: white Nge2 allows Nxc2+ winning rook on a1 (multi-ply L1)',
    motif: 'hangs',
    source: 'chess.com/game/live/167785965812 ply 17',
    prevFen:
      'r2qkb1r/pQ3ppp/4pn2/3p4/3n2b1/2N5/PPPP1PPP/R1B1KBNR w KQkq - 1 9',
    prevEval: {
      cp: 0,
      bestMoveUci: 'f1b5',
      pv: ['f1b5', 'd4b5', 'b7b5', 'f6d7', 'b5a4', 'g4h5'],
    },
    playedUci: 'g1e2',
    currEval: {
      cp: -300,
      bestMoveUci: 'd4c2',
      pv: ['d4c2', 'e1d1', 'c2a1', 'f2f3', 'f8d6', 'e2d4'],
    },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['allows', 'nxc2', 'rook', 'a1'] },
  },

  // L2 catches the silent-with-winDrop≥10 case. White retreats instead of
  // capturing a free bishop on d4; played line trades into a multi-piece
  // sacrifice on e3. Pre-fix: silent. Post-fix: L2 narrates the material
  // delta.
  {
    name: 'Real: Re1 forfeits free bishop on d4 (silent pre-fix, L2 post-fix)',
    motif: 'silent',
    source: 'chess.com/game/live/167792044890 ply 43',
    prevFen:
      'r3r1k1/1bp1qp1p/1p1p2p1/1P1P4/p1Pb4/N3R1P1/P2Q2BP/R5K1 w - - 0 22',
    prevEval: {
      cp: -327,
      bestMoveUci: 'd2d4',
      pv: ['d2d4', 'e7e3', 'd4e3', 'e8e3', 'a3c2', 'e3c3'],
    },
    playedUci: 'a1e1',
    currEval: {
      cp: -792,
      bestMoveUci: 'd4e3',
      pv: ['d4e3', 'e1e3', 'e7e3', 'd2e3', 'e8e3', 'a3c2'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['material'] },
  },

  // L2 catches knight retreat allowing gxf5 / exf5 / Bxc4+ chain. Five-ply
  // realization — no single capture covers the full delta.
  {
    name: 'Real: Nc4 retreat allows Bxc4+ chain (silent pre-fix, L2 post-fix)',
    motif: 'silent',
    source: 'chess.com/game/live/167786091554 ply 34',
    prevFen:
      'r2qbrk1/p1p3p1/4p2p/1p2np2/3PP1P1/4P2Q/PPP3P1/2KR1B1R b - - 0 17',
    prevEval: {
      cp: -309,
      bestMoveUci: 'e5g4',
      pv: ['e5g4', 'h3g3', 'd8g5', 'e4f5', 'f8f5', 'd1e1'],
    },
    playedUci: 'e5c4',
    currEval: {
      cp: -168,
      bestMoveUci: 'g4f5',
      pv: ['g4f5', 'e6f5', 'e4f5', 'd8e7', 'f1c4', 'b5c4'],
    },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['material'] },
  },

  // F1 false-positive guard: rook "fork" of queen + pawn nets zero material
  // because the queen calmly retreats. lossVsBest gate added in this commit
  // suppresses the spurious comment.
  {
    name: 'Real: Rg6 attacks queen+pawn but lossVsBest=0, F1 must stay silent',
    motif: 'silent',
    source: 'chess.com/game/live/167786254812 ply 47',
    prevFen:
      '6r1/1p2k1p1/p1npp2q/3p1p2/3P4/P1NQP1R1/1PP2P2/2K3R1 w - - 6 24',
    prevEval: {
      cp: 525,
      bestMoveUci: 'g3g6',
      pv: ['g3g6', 'h6h5', 'c3e2', 'h5h2', 'e2f4', 'e7d7'],
    },
    playedUci: 'c1b1',
    currEval: {
      cp: 371,
      bestMoveUci: 'g7g5',
      pv: ['g7g5', 'd3d2', 'e7d7', 'f2f3', 'h6f6', 'g1h1'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentNotContains: ['fork'] },
  },

  // F1 royal-fork false positive: Qf6+ checks king and "forks" g7-pawn.
  // Pre-fix: F1-royal fired with "royal fork: king and pawn" (misleading —
  // the pawn is never captured). Post-fix: F1 requires the second target
  // to be a minor piece or better, so it stays silent. L1 then picks up
  // the larger material truth (in this synthetic PV the played line drops
  // a rook several plies in).
  {
    name: 'Real: Qf6+ "royal fork" of king+pawn (F1 silent, L1 picks up material)',
    motif: 'hangs',
    source: 'chess.com/game/live/167786254812 ply 57',
    prevFen:
      '5kr1/1p4p1/p1npp1Q1/5p2/3Pp3/P1N3R1/1PP2P1q/1K4R1 w - - 4 29',
    prevEval: {
      cp: 1066,
      bestMoveUci: 'g6f6',
      pv: ['g6f6', 'f8e8', 'f6e6', 'e8f8', 'e6f5', 'f8e8'],
    },
    playedUci: 'g6e6',
    currEval: {
      cp: 684,
      bestMoveUci: 'c6e7',
      pv: ['c6e7', 'e6d6', 'h2h6', 'g3g6', 'h6g6', 'g1g6'],
    },
    mover: 'w',
    category: 'inaccuracy',
    // F1 must NOT name "royal fork" or "pawn"; SOME comment is acceptable.
    expected: { commentContains: ['rook'] },
  },

  // M1 false-positive guard: prev was mate-in-1 via Qge8#; player chose
  // Qg8# instead. Both mate. Pre-fix: M1 fired "Missed mate in 1." because
  // currEval (mated position) reports mate=0 which fails the stillMate
  // check. Post-fix: M1 returns null when played.san ends with '#'.
  {
    name: 'Real: black plays a different mate-in-1; M1 must stay silent',
    motif: 'silent',
    source: 'chess.com/game/live/167785806370 ply 134',
    prevFen: '2K5/4q3/6q1/8/8/8/8/4k3 b - - 19 67',
    prevEval: { mate: -1, bestMoveUci: 'g6e8', pv: ['g6e8'] },
    playedUci: 'g6g8',
    currEval: { mate: 0, bestMoveUci: null, pv: [] },
    mover: 'b',
    category: 'blunder',
    expected: { commentNotContains: ['missed mate'] },
  },

  // ZZ catch-all: every inaccuracy / mistake / blunder must carry SOME
  // comment. User reported the 21st move of their last game went silent
  // because no specific detector matched. This fixture locks the policy:
  // even when no tactical/material/positional pattern fits, we name the
  // engine's preferred move so the player has something to compare.
  {
    name: 'ZZ fallback: positional inaccuracy with no specific motif',
    motif: 'silent',
    source: 'user-reported "21st move went silent" pattern',
    prevFen:
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    prevEval: {
      cp: 100,
      bestMoveUci: 'f1c4',
      pv: ['f1c4', 'g8f6', 'b1c3', 'f8c5'],
    },
    playedUci: 'h2h3',
    currEval: {
      cp: -100,
      bestMoveUci: 'g8f6',
      pv: ['g8f6', 'f1c4', 'f8c5', 'e1g1'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentContains: ['better was', 'bc4'] },
  },

  // S1 false-positive guard: queen "skewers knight through pawn" but
  // lossVsBest is 0 — the back pawn is never captured.
  {
    name: 'Real: Qd4 "skewers" knight through pawn (lossVsBest=0, S1 silent)',
    motif: 'silent',
    source: 'chess.com/game/live/167785965812 ply 35',
    prevFen:
      'r6r/p2k1ppp/3q1n2/3p1p1b/8/4QP2/PP1PN1PP/n1BK1B1R w - - 4 18',
    prevEval: {
      cp: -258,
      bestMoveUci: 'e3d4',
      pv: ['e3d4', 'a8c8', 'e2c3', 'd6b6', 'f1b5', 'd7d8'],
    },
    playedUci: 'e3g5',
    currEval: {
      cp: -350,
      bestMoveUci: 'a8c8',
      pv: ['a8c8', 'e2d4', 'd6c5', 'f1b5', 'd7c7', 'g5e3'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentNotContains: ['skewer'] },
  },
];
