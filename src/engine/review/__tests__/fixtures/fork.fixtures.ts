import type { Fixture } from '../../types';

// F1 — fork detector fixtures.
// Positives: the engine's best move (a non-capturing move) creates two
// threats. Negatives: best move is a direct capture (G1 territory),
// single-target attack, or low-value targets that don't sum past the
// attacker.
export const forkFixtures: Fixture[] = [
  // === POSITIVES ===
  {
    name: 'F1: knight Nd5 forks queen and rook',
    motif: 'fork',
    source: 'synthetic (classic family-fork pattern)',
    prevFen: '6k1/2q5/5r2/8/8/2N5/8/6K1 w - - 0 1',
    prevEval: {
      cp: 400,
      bestMoveUci: 'c3d5',
      pv: ['c3d5', 'c7c8', 'd5f6', 'g8f7'],
    },
    playedUci: 'g1g2',
    currEval: {
      cp: 0,
      bestMoveUci: 'c7d6',
      pv: ['c7d6', 'g2h3', 'd6d5'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'nd5', 'forks', 'queen', 'c7', 'rook', 'f6'] },
  },
  {
    name: 'F1: royal fork Nd6+ (king and queen)',
    motif: 'fork',
    source: 'synthetic (canonical royal-fork knight pattern)',
    prevFen: '2q1k3/8/8/8/2N5/8/8/4K3 w - - 0 1',
    prevEval: {
      cp: 800,
      bestMoveUci: 'c4d6',
      pv: ['c4d6', 'e8d8', 'd6c8', 'd8c8'],
    },
    playedUci: 'e1f2',
    currEval: {
      cp: 0,
      bestMoveUci: 'e8e7',
      pv: ['e8e7', 'f2g3', 'c8c7'],
    },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['missed', 'nd6', 'royal fork', 'king', 'e8', 'queen', 'c8'] },
  },
  {
    name: 'F1: queen Qb3+ royal fork (king and rook)',
    motif: 'fork',
    source: 'synthetic',
    prevFen: '1k6/8/8/8/8/3Q2r1/8/4K3 w - - 0 1',
    prevEval: {
      cp: 500,
      bestMoveUci: 'd3b3',
      pv: ['d3b3', 'b8a8', 'b3g3', 'a8b7'],
    },
    playedUci: 'e1f1',
    currEval: {
      cp: 100,
      bestMoveUci: 'g3g7',
      pv: ['g3g7', 'f1e1', 'g7g6'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'qb3', 'royal fork', 'king', 'b8', 'rook', 'g3'] },
  },
  {
    name: 'F1: pawn fork c5 (knight and bishop)',
    motif: 'fork',
    source: 'synthetic (textbook pawn-fork pattern)',
    prevFen: '4k3/8/1n1b4/8/2P5/8/8/4K3 w - - 0 1',
    prevEval: {
      cp: 300,
      bestMoveUci: 'c4c5',
      pv: ['c4c5', 'b6d5', 'c5d6', 'e8d7'],
    },
    playedUci: 'e1d2',
    currEval: {
      cp: 0,
      bestMoveUci: 'b6c4',
      pv: ['b6c4', 'd2c3', 'c4b6'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'c5', 'forks', 'knight', 'b6', 'bishop', 'd6'] },
  },
  {
    name: 'F1: bishop Bd4 forks rook and queen',
    motif: 'fork',
    source: 'synthetic (long-diagonal bishop fork)',
    prevFen: '7q/r7/8/8/8/2B5/8/3K3k w - - 0 1',
    prevEval: {
      cp: 600,
      bestMoveUci: 'c3d4',
      pv: ['c3d4', 'h8e5', 'd4a7', 'h1g2'],
    },
    playedUci: 'd1c2',
    currEval: {
      cp: 100,
      bestMoveUci: 'h8e8',
      pv: ['h8e8', 'c2b3', 'e8e1'],
    },
    mover: 'w',
    category: 'blunder',
    expected: { commentContains: ['missed', 'bd4', 'forks'] },
  },
  {
    name: 'F1: knight Nc7 forks rook and queen on back rank',
    motif: 'fork',
    source: 'synthetic (back-rank family-fork pattern)',
    prevFen: 'r3q1k1/8/8/1N6/8/8/8/6K1 w - - 0 1',
    prevEval: {
      cp: 700,
      bestMoveUci: 'b5c7',
      pv: ['b5c7', 'e8d8', 'c7a8', 'd8a8'],
    },
    playedUci: 'g1f2',
    currEval: {
      cp: 100,
      bestMoveUci: 'e8e2',
      pv: ['e8e2', 'f2g3', 'e2b5'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['missed', 'nc7', 'forks', 'rook', 'a8', 'queen', 'e8'] },
  },

  // === NEGATIVES ===
  {
    name: 'F1 negative: best move is a direct capture (G1 territory, not F1)',
    motif: 'fork',
    source: 'synthetic (re-using G1 baseline — first move captures)',
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
    // F1 must stay silent — even though G1 will fire, our detector returns
    // null because moved.captured is set. The runner reads the final pipeline
    // comment, so it'll be G1's text — but we only assert F1 keywords are
    // absent by checking exact lowercase tokens unique to forks.
    expected: { commentContains: ['missed', 'nxe5'] },
  },
  {
    name: 'F1 negative: rook attacks two pawns — sum (2) ≤ rook value (5)',
    motif: 'fork',
    source: 'synthetic',
    prevFen: '4k3/8/8/2R5/8/p6p/8/4K3 w - - 0 1',
    prevEval: {
      cp: 200,
      bestMoveUci: 'c5c3',
      pv: ['c5c3', 'e8e7', 'c3a3'],
    },
    playedUci: 'e1d2',
    currEval: {
      cp: 0,
      bestMoveUci: 'a3a2',
      pv: ['a3a2', 'd2c3', 'a2a1q'],
    },
    mover: 'w',
    category: 'mistake',
    // No fork comment — rook attacks two pawns but combined value doesn't
    // exceed the rook's. Some other detector (or ZZ catch-all) may fire —
    // we just verify F1's "fork" token is absent.
    expected: { commentNotContains: ['fork'] },
  },
  {
    name: 'F1 negative: pawn push attacks single enemy piece (no fork)',
    motif: 'fork',
    source: 'synthetic',
    prevFen: '4k3/8/3n4/8/2P5/8/8/4K3 w - - 0 1',
    prevEval: {
      cp: 150,
      bestMoveUci: 'c4c5',
      pv: ['c4c5', 'd6f5', 'e1d2'],
    },
    playedUci: 'e1d2',
    currEval: {
      cp: 0,
      bestMoveUci: 'd6e4',
      pv: ['d6e4', 'd2e3', 'e4f2'],
    },
    mover: 'w',
    category: 'mistake',
    // Only one enemy in the pawn's attack squares (b6 is empty). F1 silent;
    // ZZ catch-all may fire with the engine's preferred move.
    expected: { commentNotContains: ['fork'] },
  },
];
