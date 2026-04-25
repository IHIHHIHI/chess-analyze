import type { Fixture } from '../../types';

// Golden M1/M2/G1/L1 fixtures locking PR #4 behavior.
// These are the regression tests the rest of the refactor must not break.
export const materialFixtures: Fixture[] = [
  {
    name: 'M1: missed Qxf7# (Scholar\'s mate position)',
    motif: 'mate',
    source: 'synthetic (canonical Scholar\'s mate)',
    prevFen:
      'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    prevEval: { mate: 1, bestMoveUci: 'h5f7', pv: ['h5f7'] },
    playedUci: 'h5h4',
    currEval: { cp: 0, bestMoveUci: 'a7a6', pv: ['a7a6'] },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['missed mate', '1.'] },
  },
  {
    name: 'M2: 1.f3 e5 2.g4?? allows Qh4# (Fool\'s mate)',
    motif: 'mate',
    source: 'synthetic (canonical Fool\'s mate)',
    prevFen:
      'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
    prevEval: {
      cp: -50,
      bestMoveUci: 'e2e4',
      pv: ['e2e4', 'b8c6', 'b1c3'],
    },
    playedUci: 'g2g4',
    currEval: { mate: -1, bestMoveUci: 'd8h4', pv: ['d8h4'] },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['allows mate', '1.'] },
  },
  {
    name: 'G1: missed Nxe5 winning a hanging knight',
    motif: 'gains',
    source: 'synthetic',
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
    expected: { commentContains: ['missed', 'nxe5', 'knight', 'e5'] },
  },
  {
    name: 'L1: 3.Qd3?? drops queen to Bxd3',
    motif: 'hangs',
    source:
      'synthetic (1. d4 d5 2. Bf4 Bf5 3. Qd3?? — common beginner blunder)',
    prevFen:
      'rn1qkbnr/ppp1pppp/8/3p1b2/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 2 3',
    prevEval: {
      cp: 30,
      bestMoveUci: 'g1f3',
      pv: ['g1f3', 'g8f6', 'b1c3', 'b8c6'],
    },
    playedUci: 'd1d3',
    currEval: {
      cp: -600,
      bestMoveUci: 'f5d3',
      pv: ['f5d3', 'c2d3', 'b8c6', 'g1f3'],
    },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['drops', 'queen', 'd3', 'bxd3'] },
  },
  {
    name: 'silent: positional inaccuracy (Na3 instead of Bc4)',
    motif: 'silent',
    source: 'synthetic Italian-game-like position',
    prevFen:
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    prevEval: {
      cp: 100,
      bestMoveUci: 'f1c4',
      pv: ['f1c4', 'g8f6', 'b1c3', 'f8c5'],
    },
    playedUci: 'b1a3',
    currEval: {
      cp: -100,
      bestMoveUci: 'g8f6',
      pv: ['g8f6', 'f1c4', 'f8c5', 'e1g1'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { comment: null },
  },
  {
    name: 'silent: opening move classified as good (early-exit gate)',
    motif: 'silent',
    source: 'synthetic',
    prevFen:
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    prevEval: {
      cp: 30,
      bestMoveUci: 'e2e4',
      pv: ['e2e4', 'e7e5', 'g1f3'],
    },
    playedUci: 'g1f3',
    currEval: {
      cp: 25,
      bestMoveUci: 'g8f6',
      pv: ['g8f6', 'b1c3', 'd7d5'],
    },
    mover: 'w',
    category: 'good',
    expected: { comment: null },
  },
];
