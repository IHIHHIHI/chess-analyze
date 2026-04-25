import type { Fixture } from '../../types';

// S1 skewer fixtures.
//
// A skewer is a tactic where a sliding piece attacks a more valuable enemy
// piece such that, when the front piece moves, a less-valuable piece behind
// it on the same line is captured. It is the inverse of a pin (front >
// back, strictly).
//
// Reference: https://en.wikipedia.org/wiki/Skewer_(chess)
//
// Each positive fixture is a synthetic position where the engine's best
// move *creates* a skewer line that did not exist on the previous board.
// The played move is a passive king move that walks past the tactic.
// Negatives cover the three classic look-alikes: equal-value front/back
// (no value differential), pin (front strictly less valuable than back),
// and an unrelated quiet position (no slider tactic at all).
export const skewerFixtures: Fixture[] = [
  // POSITIVE: bishop skewer K -> Q on the long diagonal.
  // White Bc1 plays Bb2+; black king on d4 is checked. After black king
  // sidesteps, white's bishop sweeps to g7 winning the queen.
  {
    name: 'S1 positive: Bb2+ skewers Kd4 through Qg7',
    motif: 'skewer',
    source:
      'synthetic; classical bishop skewer on the a1-h8 diagonal ' +
      '(see https://en.wikipedia.org/wiki/Skewer_(chess))',
    prevFen: '8/6q1/8/8/3k4/8/8/K1B5 w - - 0 1',
    prevEval: {
      cp: 800,
      bestMoveUci: 'c1b2',
      pv: ['c1b2', 'd4d5', 'b2g7'],
    },
    playedUci: 'a1a2',
    currEval: {
      cp: 0,
      bestMoveUci: 'd4e4',
      pv: ['d4e4'],
    },
    mover: 'w',
    category: 'blunder',
    expected: {
      commentContains: ['missed', 'bb2', 'skewer', 'king', 'd4', 'queen', 'g7'],
    },
  },

  // POSITIVE: rook skewer Q -> R on the e-file.
  // White Rd1-Re1 attacks the black queen on e5; behind it on e8 sits a
  // rook. Black queen must abandon the file, then white plays Rxe8.
  {
    name: 'S1 positive: Re1 skewers Qe5 through Re8',
    motif: 'skewer',
    source:
      'synthetic rook skewer along an open file ' +
      '(see https://en.wikipedia.org/wiki/Skewer_(chess))',
    prevFen: '4r2k/8/8/4q3/8/8/8/3R3K w - - 0 1',
    prevEval: {
      cp: 500,
      bestMoveUci: 'd1e1',
      pv: ['d1e1', 'e5a5', 'e1e8'],
    },
    playedUci: 'h1g2',
    currEval: {
      cp: 0,
      bestMoveUci: 'e5e6',
      pv: ['e5e6'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 're1', 'skewer', 'queen', 'e5', 'rook', 'e8'],
    },
  },

  // POSITIVE: long-diagonal bishop skewer K -> R.
  // White Bb8 plays Ba7+ checking Kc5. After the king moves, white's
  // bishop slices all the way to g1 winning the rook.
  {
    name: 'S1 positive: Ba7+ skewers Kc5 through Rg1',
    motif: 'skewer',
    source:
      'synthetic; bishop skewer on the a7-g1 diagonal ' +
      '(see https://en.wikipedia.org/wiki/Skewer_(chess))',
    prevFen: '1B6/8/8/2k5/8/7K/8/6r1 w - - 0 1',
    prevEval: {
      cp: 400,
      bestMoveUci: 'b8a7',
      pv: ['b8a7', 'c5b5', 'a7g1'],
    },
    playedUci: 'h3h4',
    currEval: {
      cp: 0,
      bestMoveUci: 'c5b5',
      pv: ['c5b5'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'ba7', 'skewer', 'king', 'c5', 'rook', 'g1'],
    },
  },

  // POSITIVE: rank skewer K -> R (back-rank tactic).
  // White Ra1 plays Ra8+; the black king on c8 is in check, behind it on
  // h8 sits a rook. After Kb7, white's rook captures on h8.
  {
    name: 'S1 positive: Ra8+ skewers Kc8 through Rh8',
    motif: 'skewer',
    source:
      'synthetic back-rank rook skewer ' +
      '(see https://en.wikipedia.org/wiki/Skewer_(chess))',
    prevFen: '2k4r/8/8/8/8/8/8/R5K1 w - - 0 1',
    prevEval: {
      cp: 400,
      bestMoveUci: 'a1a8',
      pv: ['a1a8', 'c8b7', 'a8h8'],
    },
    playedUci: 'g1g2',
    currEval: {
      cp: 0,
      bestMoveUci: 'c8c7',
      pv: ['c8c7'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'ra8', 'skewer', 'king', 'c8', 'rook', 'h8'],
    },
  },

  // POSITIVE: bishop skewer K -> B (king-and-piece classic).
  // White Bc1 plays Bb2+ — same b2-g7 diagonal as the first fixture but
  // the queen has been replaced by a bishop, demonstrating the spec's
  // "front king, back any minor" case.
  {
    name: 'S1 positive: Bb2+ skewers Kd4 through Bg7',
    motif: 'skewer',
    source:
      'synthetic variant of the long-diagonal skewer with a bishop ' +
      'as the back piece',
    prevFen: '8/6b1/8/8/3k4/7K/8/2B5 w - - 0 1',
    prevEval: {
      cp: 250,
      bestMoveUci: 'c1b2',
      pv: ['c1b2', 'd4d5', 'b2g7'],
    },
    playedUci: 'h3h4',
    currEval: {
      cp: 0,
      bestMoveUci: 'd4d5',
      pv: ['d4d5'],
    },
    mover: 'w',
    category: 'mistake',
    expected: {
      commentContains: ['missed', 'bb2', 'skewer', 'king', 'd4', 'bishop', 'g7'],
    },
  },

  // NEGATIVE: pin, not skewer. Re1 lines up rook -> Ne5 -> Ke8 (front
  // knight is *less* valuable than back king — that's the inverse of a
  // skewer). The knight is defended by Bd6, so no clean material gain
  // either: Rxe5 would be answered by Bxe5 with net -2 for white. The
  // pipeline must return null on this position.
  {
    name: 'S1 negative: Re1 is a pin (Ne5 in front of Ke8, defended) — P1 narrates',
    motif: 'pin',
    source:
      'synthetic — defended pin pattern; not a skewer. P1 fires; S1 stays silent.',
    prevFen: '4k3/8/3b4/4n3/8/7K/8/3R4 w - - 0 1',
    prevEval: {
      cp: 80,
      bestMoveUci: 'd1e1',
      pv: ['d1e1', 'e8d8', 'h3g3'],
    },
    playedUci: 'h3h4',
    currEval: {
      cp: -20,
      bestMoveUci: 'e8d8',
      pv: ['e8d8'],
    },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentContains: ['re1', 'pin', 'knight', 'e5', 'king'] },
  },

  // NEGATIVE: equal-value front and back (rook attacking rook, with rook
  // behind). 5 vs 5 — strictly-greater requirement fails.
  {
    name: 'S1 negative: Re1 lines up two equal-value rooks (no skewer)',
    motif: 'silent',
    source: 'synthetic — equal-value front/back is not a skewer',
    prevFen: '4r2k/8/8/4r3/8/7K/8/3R4 w - - 0 1',
    prevEval: {
      cp: 200,
      bestMoveUci: 'd1e1',
      pv: ['d1e1', 'e5d5', 'e1e5'],
    },
    playedUci: 'h3h4',
    currEval: {
      cp: 0,
      bestMoveUci: 'e5e6',
      pv: ['e5e6'],
    },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['skewer'] },
  },
];
