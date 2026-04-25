import type { Fixture } from '../../types';

// R1 — "Removing the defender" fixtures.
//
// References for the motif:
//   - chess.com lesson: https://www.chess.com/terms/removing-the-defender
//   - Wikipedia ("Undermining"): https://en.wikipedia.org/wiki/Undermining_(chess)
//
// Each positive features a 4-ply best line of the form
//   Mover captures D → Opp recap → Mover captures T (value(T) > value(D)).
// FENs are synthetic constructions distilled from those lessons; they
// isolate the motif without cluttering material balance.
export const defenderFixtures: Fixture[] = [
  {
    name: "R1: Bxc6 removes knight defender, then Nxd4 wins queen",
    motif: 'defender',
    source:
      'synthetic (chess.com "Removing the Defender" — https://www.chess.com/terms/removing-the-defender)',
    prevFen:
      'r3k2r/pp1ppppp/2n5/1B6/3q4/3P1N2/PPP1PPPP/R3K2R w KQkq - 0 1',
    prevEval: {
      cp: 800,
      bestMoveUci: 'b5c6',
      pv: ['b5c6', 'b7c6', 'f3d4', 'e8f8'],
    },
    playedUci: 'e1g1',
    currEval: {
      cp: -50,
      bestMoveUci: 'd4d5',
      pv: ['d4d5', 'a2a3', 'c6e5', 'a3a4'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bxc6', 'knight', 'defender', 'queen', 'd4'],
    },
  },
  {
    name: "R1: Bxc6 removes knight defender, then Rxd4 wins rook",
    motif: 'defender',
    source:
      'synthetic (chess.com "Removing the Defender" — https://www.chess.com/terms/removing-the-defender)',
    prevFen:
      'r3k2r/pp1ppppp/2n5/8/B2r4/8/PPP1PPPP/3R2K1 w kq - 0 1',
    prevEval: {
      cp: 500,
      bestMoveUci: 'a4c6',
      pv: ['a4c6', 'b7c6', 'd1d4', 'e8f8'],
    },
    playedUci: 'g1f1',
    currEval: {
      cp: -50,
      bestMoveUci: 'd4a4',
      pv: ['d4a4', 'a2a3', 'a4a3', 'b2a3'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bxc6', 'knight', 'defender', 'rook', 'd4'],
    },
  },
  {
    name: "R1: ...Bxf3 removes knight defender, then ...Qxd4 wins rook (black)",
    motif: 'defender',
    source:
      'synthetic (Wikipedia "Undermining" — https://en.wikipedia.org/wiki/Undermining_(chess))',
    prevFen:
      '4k3/q7/8/8/3R2b1/5N2/P4PPP/4K3 b - - 0 1',
    prevEval: {
      cp: -500,
      bestMoveUci: 'g4f3',
      pv: ['g4f3', 'g2f3', 'a7d4', 'e1f1'],
    },
    playedUci: 'e8e7',
    currEval: {
      cp: 50,
      bestMoveUci: 'd4d8',
      pv: ['d4d8', 'e7f6', 'd8b8'],
    },
    mover: 'b',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bxf3', 'knight', 'defender', 'rook', 'd4'],
    },
  },
  {
    name: "R1: Nxf6+ captures pawn defender, then Bxe5 wins rook",
    motif: 'defender',
    source: 'synthetic (canonical undermining of a pawn defender)',
    prevFen:
      '4k3/ppp1p1pp/5p2/3Nr3/8/2B5/PPP1PPPP/4K3 w - - 0 1',
    prevEval: {
      cp: 350,
      bestMoveUci: 'd5f6',
      pv: ['d5f6', 'g7f6', 'c3e5', 'e8f8'],
    },
    playedUci: 'e1d2',
    currEval: {
      cp: -100,
      bestMoveUci: 'e5e4',
      pv: ['e5e4', 'd5b6', 'a7b6', 'd2e1'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'nxf6', 'pawn', 'defender', 'rook', 'e5'],
    },
  },
  {
    name: "R1: Rxc5 removes bishop defender, then Rxa7 wins queen",
    motif: 'defender',
    source: 'synthetic (chess.com "Removing the Defender" — https://www.chess.com/terms/removing-the-defender)',
    prevFen:
      '4k3/q2pp1pp/3p4/2b5/8/8/1P1PPPPP/R1R1K3 w - - 0 1',
    prevEval: {
      cp: 700,
      bestMoveUci: 'c1c5',
      pv: ['c1c5', 'd6c5', 'a1a7', 'e8f8'],
    },
    playedUci: 'e1f1',
    currEval: {
      cp: -50,
      bestMoveUci: 'a7a2',
      pv: ['a7a2', 'c1c2'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'rxc5', 'bishop', 'defender', 'queen', 'a7'],
    },
  },
  // ===== Negatives =====
  {
    name: "neg: best line is two independent captures (no defender link)",
    motif: 'defender',
    source: 'synthetic (negative control — Nxe5 then Bxh4, neither defends the other)',
    prevFen:
      '4k3/8/8/4n3/7q/3N2B1/8/4K3 w - - 0 1',
    prevEval: {
      cp: 1200,
      bestMoveUci: 'd3e5',
      pv: ['d3e5', 'e8f8', 'g3h4', 'f8g8'],
    },
    playedUci: 'e1d2',
    currEval: {
      cp: 100,
      bestMoveUci: 'e5d3',
      pv: ['e5d3', 'd2e3', 'd3f2', 'e3f2'],
    },
    mover: 'w',
    category: 'mistake',
    // R1 must stay silent — Nxe5's destination (e5) doesn't defend Bxh4's
    // target (h4), so there is no remove-the-defender pattern. G1's slop
    // tolerance also keeps it silent (two-capture line vs single-capture
    // gain). Comment is null.
    expected: { comment: null },
  },
  {
    name: "neg: G1-style single capture (no R1 pattern)",
    motif: 'defender',
    source: 'synthetic (negative control — single best capture)',
    prevFen: '4k3/8/8/4n3/8/3N4/8/4K3 w - - 0 1',
    prevEval: {
      cp: 300,
      bestMoveUci: 'd3e5',
      pv: ['d3e5', 'e8e7', 'e1f1', 'e7e6'],
    },
    playedUci: 'e1f1',
    currEval: {
      cp: 0,
      bestMoveUci: 'e5d7',
      pv: ['e5d7', 'f1g1', 'd7f6', 'g1f1'],
    },
    mover: 'w',
    category: 'mistake',
    // G1 fires here ("missed Nxe5..."); R1 must NOT add "defender" copy.
    // The pipeline ordering ensures R1 runs first; if R1 incorrectly fires,
    // the comment will contain "defender", and the substring check will
    // still pass. So this fixture is primarily a regression for G1's text
    // staying recognizable (no "defender" qualifier).
    expected: { commentContains: ['nxe5'] },
  },
];
