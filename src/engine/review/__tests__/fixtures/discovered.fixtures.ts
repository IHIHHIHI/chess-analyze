import type { Fixture } from '../../types';

// D1 — Discovered attack / discovered check fixtures.
//
// Each "positive" fixture is a position where the engine's best move uncovers
// a friendly long-range piece's line at a valuable enemy target, and the
// played move is something passive that misses the motif.
//
// Categorical examples / motivation are drawn from the Wikipedia articles:
//   https://en.wikipedia.org/wiki/Discovered_attack
//   https://en.wikipedia.org/wiki/Discovered_check
//
// Concrete FENs are synthetic minimal positions that isolate one motif each.
export const discoveredFixtures: Fixture[] = [
  {
    name:
      'D1: Nc5+ — knight steps off the e-file, rook gives discovered check',
    motif: 'discovered',
    source:
      'synthetic (canonical knight+rook discovered check, cf. Wikipedia "Discovered check")',
    // White: Kg1, Re1, Ne4. Black: Ke8, Qa6.
    // Nc5+ uncovers Re1 attacking Ke8 AND attacks Qa6 — discovered check
    // followed by Nxa6 wins the queen.
    prevFen: '4k3/8/q7/8/4N3/8/8/4R1K1 w - - 0 1',
    prevEval: {
      cp: 500,
      bestMoveUci: 'e4c5',
      pv: ['e4c5', 'e8f8', 'c5a6'],
    },
    playedUci: 'e1e2',
    currEval: {
      cp: -100,
      bestMoveUci: 'a6a3',
      pv: ['a6a3', 'g1f1'],
    },
    mover: 'w',
    category: 'blunder',
    expected: {
      commentContains: ['missed', 'nc5', 'discovered check', 'rook'],
    },
  },
  {
    name:
      'D1: Ng5 — knight unmasks Re1 attacking the queen pinned to the king',
    motif: 'discovered',
    source: 'synthetic (knight+rook discovered attack on a pinned queen)',
    // White: Kg1, Re1, Ne4. Black: Ke8, Qe7.
    // Ng5 leaves the e-file; Re1 attacks Qe7 and the queen is pinned to Ke8.
    // Black's only relief is Qxe1+, dropping the queen for the rook.
    prevFen: '4k3/4q3/8/8/4N3/8/8/4R1K1 w - - 0 1',
    prevEval: {
      cp: 350,
      bestMoveUci: 'e4g5',
      pv: ['e4g5', 'e7e1', 'g1h2'],
    },
    playedUci: 'g1h1',
    currEval: {
      cp: -50,
      bestMoveUci: 'e7c5',
      pv: ['e7c5', 'h1g2'],
    },
    mover: 'w',
    category: 'blunder',
    expected: {
      commentContains: ['missed', 'ng5', 'discovered attack', 'queen', 'e7'],
    },
  },
  {
    name:
      'D1: Nc6+ — knight steps off the long diagonal, bishop gives discovered check',
    motif: 'discovered',
    source:
      'synthetic (knight+bishop discovered check on a1-h8, cf. Wikipedia "Discovered check")',
    // White: Kf1, Bb2, Nd4. Black: Kh8, Rb8.
    // Nc6+ uncovers Bb2 attacking Kh8 and forks Rb8 — Nxb8 wins the rook.
    prevFen: '1r5k/8/8/8/3N4/8/1B6/5K2 w - - 0 1',
    prevEval: {
      cp: 600,
      bestMoveUci: 'd4c6',
      pv: ['d4c6', 'h8g8', 'c6b8'],
    },
    playedUci: 'f1g1',
    currEval: {
      cp: 50,
      bestMoveUci: 'b8d8',
      pv: ['b8d8', 'g1f1'],
    },
    mover: 'w',
    category: 'blunder',
    expected: {
      commentContains: ['missed', 'nc6', 'discovered check', 'bishop'],
    },
  },
  {
    name:
      'D1: Nf3 — knight unmasks Bb2 attacking the rook on e5',
    motif: 'discovered',
    source: 'synthetic (knight+bishop discovered attack on a long-diagonal rook)',
    // White: Kg1, Bb2, Nd4. Black: Kf8, Re5.
    // Nf3 leaves the long diagonal; Bb2 now attacks the unprotected Re5.
    // Knight is also out of the way to support continuations.
    prevFen: '5k2/8/8/4r3/3N4/8/1B6/6K1 w - - 0 1',
    prevEval: {
      cp: 400,
      bestMoveUci: 'd4f3',
      pv: ['d4f3', 'e5e3', 'b2e5'],
    },
    playedUci: 'g1h1',
    currEval: {
      cp: 50,
      bestMoveUci: 'e5e2',
      pv: ['e5e2', 'h1g1'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'nf3', 'discovered attack', 'rook', 'e5'],
    },
  },
  {
    name:
      'D1: Nc6+ — knight unmasks Qa1 along the long diagonal for a discovered check',
    motif: 'discovered',
    source:
      'synthetic (knight+queen discovered check on a1-h8 diagonal)',
    // White: Kg1, Qa1, Nd4. Black: Kh8, Re7.
    // Nc6+ uncovers Qa1 attacking Kh8 and forks Re7 — Nxe7+ wins the rook.
    prevFen: '7k/4r3/8/8/3N4/8/8/Q5K1 w - - 0 1',
    prevEval: {
      cp: 700,
      bestMoveUci: 'd4c6',
      pv: ['d4c6', 'h8g8', 'c6e7'],
    },
    playedUci: 'g1h1',
    currEval: {
      cp: 100,
      bestMoveUci: 'e7e1',
      pv: ['e7e1', 'h1h2'],
    },
    mover: 'w',
    category: 'blunder',
    expected: {
      commentContains: ['missed', 'nc6', 'discovered check', 'queen'],
    },
  },
  {
    name: 'D1 negative: best is a direct knight capture (no discovery)',
    motif: 'discovered',
    source: 'synthetic (G1 territory — single direct capture, deferred)',
    // Same shape as the G1 fixture: best Nxe5 captures the hanging knight,
    // and no friendly piece behind d3 lights up. D1 must return null.
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
    // The G1 detector still narrates this — D1 just shouldn't claim a
    // discovery. So we accept the G1 wording (its first finding wins).
    expected: { commentContains: ['nxe5', 'knight'] },
  },
  {
    name: 'D1 negative: silent positional inaccuracy, no discovery exists',
    motif: 'discovered',
    source: 'synthetic Italian-game-like position (mirrors silent fixture)',
    // The engine prefers the developing Bc4. No discovered attacker appears
    // anywhere on the board after Bc4 — D1 stays silent and the pipeline
    // returns null overall (matches the existing silent fixture behavior).
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
];
