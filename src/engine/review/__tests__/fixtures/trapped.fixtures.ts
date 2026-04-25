import type { Fixture } from '../../types';

// T1 trapped-piece detector fixtures.
//
// A "trap" is a position where, after the engine's best move, an enemy
// piece worth ≥ 3 has no legal move to a safe square. The played move
// missed this. We require the trap to be NEW (the piece was either not
// attacked or had a safe escape on prevBoard) so we don't fire on already-
// trapped pieces that the player merely failed to capitalize on.
export const trappedFixtures: Fixture[] = [
  // ── Positives ──────────────────────────────────────────────────────────

  {
    name: 'T1: Noah\'s Ark — ...c4 traps Bb3',
    motif: 'trapped',
    source:
      'Classical opening trap (Ruy Lopez Noah\'s Ark): https://en.wikipedia.org/wiki/Noah%27s_Ark_Trap',
    // Position after 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3
    // Nxd4 7.Nxd4 exd4 8.Qxd4 c5 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5. Black to
    // move; ...c4 traps the white bishop on b3 (only Ba4 or Bxc4, both
    // lose material — pawn cluster a-,b-,c- denies any retreat).
    prevFen:
      'r2qkbnr/3b1ppp/p2p4/1ppQ4/4P3/1B6/PPP2PPP/RNB1K2R b KQkq - 1 11',
    prevEval: {
      cp: -150,
      bestMoveUci: 'c5c4',
      pv: ['c5c4', 'd5h5', 'c4b3', 'a2b3'],
    },
    playedUci: 'f8e7',
    currEval: {
      cp: 100,
      bestMoveUci: 'd5d4',
      pv: ['d5d4', 'g8f6'],
    },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['missed', 'c4', 'traps', 'bishop', 'b3'] },
  },

  {
    name: 'T1: knight in corner — b6→b7 traps Na8',
    motif: 'trapped',
    source: 'synthetic (classic "knight on the rim" corner trap)',
    // Black knight on a8. White pawn pushes b6-b7 attacking the knight.
    // Knight has only Nc7 (attacked by d6 pawn) and Nb6 (attacked by a5
    // pawn) — both unsafe.
    prevFen: 'n6k/8/1P1P4/P7/8/8/8/4K3 w - - 0 1',
    prevEval: {
      cp: 250,
      bestMoveUci: 'b6b7',
      pv: ['b6b7', 'h8h7', 'b7a8q'],
    },
    playedUci: 'a5a6',
    currEval: {
      cp: -50,
      bestMoveUci: 'a8b6',
      pv: ['a8b6', 'a6a7'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'b7', 'traps', 'knight', 'a8'] },
  },

  {
    name: 'T1: bishop trapped behind pawn chain — b5→b6',
    motif: 'trapped',
    source:
      'synthetic (classic bishop-on-a5 pawn-chain trap, mirror of Lichess opening-trap puzzles)',
    // Black bishop on a5, attacked by white b4 pawn. Currently bishop has
    // Bc7 and Bd8 as safe escapes. White's b5-b6 push closes the c7/d8
    // diagonal, leaving only Bxb4+ (a3 recaptures) and Bxb6 (c5 recaptures)
    // — both lose the bishop for a pawn.
    prevFen: '4k3/8/8/bPP5/1P6/P7/8/4K3 w - - 0 1',
    prevEval: {
      cp: 200,
      bestMoveUci: 'b5b6',
      pv: ['b5b6', 'a5b4', 'a3b4'],
    },
    playedUci: 'c5c6',
    currEval: {
      cp: -100,
      bestMoveUci: 'a5b6',
      pv: ['a5b6'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'b6', 'traps', 'bishop', 'a5'] },
  },

  {
    name: 'T1: black ...c4 traps the wandering Na1',
    motif: 'trapped',
    source: 'synthetic',
    // White knight on a1 is already attacked by a long-diagonal black
    // bishop on h8. Currently the knight can run to b3 (no attacker).
    // Black's c5-c4 push attacks b3, while a black pawn already on d3
    // covers c2 — both knight squares are unsafe, knight is trapped.
    prevFen: '4k2b/8/8/2p5/8/3p4/8/N6K b - - 0 1',
    prevEval: {
      cp: -250,
      bestMoveUci: 'c5c4',
      pv: ['c5c4', 'h1g2', 'h8a1'],
    },
    playedUci: 'e8d8',
    currEval: {
      cp: 50,
      bestMoveUci: 'h1g2',
      pv: ['h1g2'],
    },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['missed', 'c4', 'traps', 'knight', 'a1'] },
  },

  // ── Negatives ──────────────────────────────────────────────────────────

  {
    name: 'T1 negative: opening waiting move, no trap available',
    motif: 'trapped',
    source: 'synthetic',
    // Starting position. Best is g1-f3 (developing); played a2-a3 is a
    // tiny positional inaccuracy. Nothing on the board is even close to
    // being trapped, so T1 must stay silent.
    prevFen:
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    prevEval: {
      cp: 30,
      bestMoveUci: 'g1f3',
      pv: ['g1f3', 'e7e5', 'd2d4'],
    },
    playedUci: 'a2a3',
    currEval: {
      cp: -45,
      bestMoveUci: 'e7e5',
      pv: ['e7e5', 'g1f3'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentNotContains: ['trap'] },
  },

  {
    name: 'T1 negative: K+P endgame inaccuracy — no non-pawn target on board',
    motif: 'trapped',
    source: 'synthetic (basic king-and-pawn endgame)',
    // K+P endgame: best is e4-e5 advancing the pawn; played Ke2 wastes a
    // tempo. There are no enemy pieces of value ≥ 3 on the board, so T1
    // cannot fire — and no other named tactic applies either, so the
    // overall comment is null.
    prevFen: '4k3/8/8/8/4P3/8/8/4K3 w - - 0 1',
    prevEval: {
      cp: 80,
      bestMoveUci: 'e4e5',
      pv: ['e4e5', 'e8d7', 'e1e2'],
    },
    playedUci: 'e1e2',
    currEval: {
      cp: 0,
      bestMoveUci: 'e8e7',
      pv: ['e8e7'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentNotContains: ['trap'] },
  },
];
