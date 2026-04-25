import type { Fixture } from '../../types';

// P1 (Pin) — engine's best move creates a pin the played move missed.
//
// Each positive: best move is a non-capturing slider move that establishes a
// new pin where pinned piece value >= 3 and anchor value > pinned value.
// Negatives: pin already existed in prev (not created by best); pin is to a
// same-value piece; pinned piece is too low value (pawn).
export const pinFixtures: Fixture[] = [
  // ----- POSITIVES -----
  {
    name: 'P1: missed Bb5 — pins knight on c6 to the king',
    motif: 'pin',
    source:
      'synthetic (canonical Ruy Lopez Bb5 pin shape — '
      + 'https://en.wikipedia.org/wiki/Pin_(chess)#Absolute_pin)',
    prevFen: 'r3k3/ppp2ppp/2n5/8/8/8/PPP2PPP/4KB1R w K - 0 1',
    prevEval: {
      cp: 200,
      bestMoveUci: 'f1b5',
      pv: ['f1b5', 'h7h6', 'e1g1'],
    },
    playedUci: 'f1c4',
    currEval: { cp: 20, bestMoveUci: 'h7h6', pv: ['h7h6'] },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bb5', 'pin', 'knight', 'c6', 'king'],
    },
  },
  {
    name: 'P1: missed Bg5 — pins knight on f6 to the queen on d8',
    motif: 'pin',
    source:
      'synthetic (Italian/Scotch-style Bg5 vs ...Nf6 — '
      + 'https://en.wikipedia.org/wiki/Pin_(chess)#Relative_pin)',
    prevFen:
      'r1bqkb1r/pppp1ppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5',
    prevEval: {
      cp: 80,
      bestMoveUci: 'c1g5',
      pv: ['c1g5', 'f8e7', 'f1c4'],
    },
    playedUci: 'f1c4',
    currEval: { cp: -50, bestMoveUci: 'f8e7', pv: ['f8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bg5', 'pin', 'knight', 'f6', 'queen', 'd8'],
    },
  },
  {
    name: 'P1: missed Re1 — pins bishop on e5 to the queen on e8',
    motif: 'pin',
    source: 'synthetic (rook pin along open file)',
    prevFen: '4q1k1/ppp3pp/3p4/4b3/8/8/PPP3PP/3K3R w - - 0 1',
    prevEval: {
      cp: -200,
      bestMoveUci: 'h1e1',
      pv: ['h1e1', 'e8d8', 'd1c1'],
    },
    playedUci: 'd1c1',
    currEval: { cp: -400, bestMoveUci: 'e5f4', pv: ['e5f4'] },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 're1', 'pin', 'bishop', 'e5', 'queen', 'e8'],
    },
  },
  {
    name: 'P1 (black): missed Bb4 — pins knight on d2 to the king',
    motif: 'pin',
    source:
      'synthetic (mirror of Bb5 motif from black\'s side — '
      + 'https://en.wikipedia.org/wiki/Pin_(chess))',
    prevFen: '4k3/4b3/8/8/8/8/3N4/4K3 b - - 0 1',
    prevEval: {
      cp: -150,
      bestMoveUci: 'e7b4',
      pv: ['e7b4', 'e1f1', 'b4d2'],
    },
    playedUci: 'e7d6',
    currEval: { cp: 0, bestMoveUci: 'e1f1', pv: ['e1f1'] },
    mover: 'b',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bb4', 'pin', 'knight', 'd2', 'king'],
    },
  },
  {
    name: 'P1: missed Rh8+ — pins knight on d8 to the rook on a8',
    motif: 'pin',
    source: 'synthetic (back-rank rook pin behind a knight)',
    prevFen: 'r2n4/4k3/8/8/8/8/8/3K3R w - - 0 1',
    prevEval: {
      cp: 300,
      bestMoveUci: 'h1h8',
      pv: ['h1h8', 'e7e6'],
    },
    playedUci: 'd1c1',
    currEval: { cp: 80, bestMoveUci: 'e7e6', pv: ['e7e6'] },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'rh8', 'pin', 'knight', 'd8', 'rook', 'a8'],
    },
  },

  // ----- NEGATIVES -----
  {
    name: 'P1 negative: pin existed in prev (best move does not create one)',
    motif: 'pin',
    source: 'synthetic (white\'s Bb5 already pins Nc6 in starting FEN)',
    prevFen: 'r3k3/ppp2ppp/2n5/1B6/8/8/PPPP1PPP/RN1QK1NR w KQ - 0 1',
    prevEval: {
      cp: 80,
      bestMoveUci: 'b1c3',
      pv: ['b1c3', 'a7a6', 'd2d4'],
    },
    playedUci: 'b5a4',
    currEval: { cp: -80, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { comment: null },
  },
  {
    name: 'P1 negative: anchor is same value as pinned (rook would pin bishop to bishop)',
    motif: 'pin',
    source:
      'synthetic (rook attacks bishop on e5 with another minor piece behind — '
      + 'no value differential, so not a real pin)',
    prevFen: '4n1k1/8/8/4b3/8/8/8/3K3R w - - 0 1',
    prevEval: {
      cp: 0,
      bestMoveUci: 'h1e1',
      pv: ['h1e1', 'e5f4', 'e1e3'],
    },
    playedUci: 'd1c2',
    currEval: { cp: -100, bestMoveUci: 'e5f6', pv: ['e5f6'] },
    mover: 'w',
    category: 'inaccuracy',
    expected: { comment: null },
  },
  {
    name: 'P1 negative: pinned piece is a pawn (under 3-pt threshold)',
    motif: 'pin',
    source:
      'synthetic (rook to e1 pinning pawn to king — too low value to narrate)',
    prevFen: '4k3/8/8/4p3/8/8/8/3K3R w - - 0 1',
    prevEval: {
      cp: 80,
      bestMoveUci: 'h1e1',
      pv: ['h1e1', 'e8d8', 'd1c1'],
    },
    playedUci: 'd1c2',
    currEval: { cp: -30, bestMoveUci: 'e8d8', pv: ['e8d8'] },
    mover: 'w',
    category: 'mistake',
    expected: { comment: null },
  },
];
