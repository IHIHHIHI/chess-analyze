import type { Fixture } from '../../types';

// Positional-fallback fixtures — exercise the PS1..PS7 detectors that fire
// when the played move lacks a tactical/material explanation but still
// dropped the eval by ≥ 10 win-percentage points.
//
// References (general):
// - https://www.chess.com/article/view/the-pawn-structure
// - https://en.wikipedia.org/wiki/Pawn_structure
// - https://en.wikipedia.org/wiki/Bishop_(chess)#Bishop_pair
// - https://en.wikipedia.org/wiki/Castling
//
// All FENs/PVs are synthetic minimal positions chosen to isolate ONE
// pattern at a time. The eval (cp) values are deliberately tuned so the
// mover-perspective win-% drop is ≥ 10 (PS gate) without inviting the
// material/tactical detectors that run earlier in the pipeline.
export const positionalFixtures: Fixture[] = [
  // ──────────────────────────────────────────────────────────────────
  // PS1 — Doubled pawns
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS1: white cxd5 doubles the d-file',
    motif: 'positional',
    source: 'synthetic (doubled-pawns motif)',
    prevFen: '4k3/8/4p3/3n4/2P5/3P4/P7/4K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'e1f2', pv: ['e1f2', 'd5f6'] },
    playedUci: 'c4d5',
    currEval: { cp: -100, bestMoveUci: 'e6d5', pv: ['e6d5'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['doubles', 'd-file'] },
  },
  {
    name: 'PS1: black cxd6 doubles the d-file',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '6k1/2p5/3N4/3p4/8/8/8/4K3 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'c7c6', pv: ['c7c6'] },
    playedUci: 'c7d6',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['doubles', 'd-file'] },
  },
  {
    name: 'PS1: black gxh6 doubles the h-file',
    motif: 'positional',
    source: 'synthetic',
    prevFen: 'k7/6pp/7B/8/8/8/8/4K3 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'a8b7', pv: ['a8b7'] },
    playedUci: 'g7h6',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['doubles', 'h-file'] },
  },
  {
    name: 'PS1 negative: doubled pawns already exist; played is a king move',
    motif: 'positional',
    source: 'synthetic (no NEW doubling)',
    prevFen: '4k3/8/8/3b4/1P6/1P6/P7/4K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'a2a4', pv: ['a2a4'] },
    playedUci: 'e1f2',
    currEval: { cp: -100, bestMoveUci: 'd5b3', pv: ['d5b3'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['doubles'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS2 — Isolated pawn
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS2: white cxb3 isolates the d-pawn',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/1n1P4/2P5/4K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    playedUci: 'c2b3',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['isolates', '-pawn'] },
  },
  {
    name: 'PS2: black cxb6 isolates the d-pawn',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '7k/2p5/1N1p4/8/8/8/8/4K3 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'h8g8', pv: ['h8g8'] },
    playedUci: 'c7b6',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['isolates', '-pawn'] },
  },
  {
    name: 'PS2: white bxa4 leaves the c-pawn isolated',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/n7/1P6/2P5/7K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'h1g1', pv: ['h1g1'] },
    playedUci: 'b3a4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['isolates', '-pawn'] },
  },
  {
    name: 'PS2 negative: isolated pawn already exists; count unchanged',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/P3PP2/7K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'e2e4', pv: ['e2e4'] },
    playedUci: 'a2a3',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['isolates'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS3 — Backward pawn
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS3: white b3-b4 leaves c3 backward (Pd5 controls c4)',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/3p4/8/1PP5/P7/4K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'a2a3', pv: ['a2a3'] },
    playedUci: 'b3b4',
    currEval: { cp: -100, bestMoveUci: 'd5d4', pv: ['d5d4'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['backward'] },
  },
  {
    name: 'PS3: black b6-b5 leaves c6 backward (white Pd4 controls c5)',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/p7/1pp5/8/3P4/8/8/4K3 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'a7a6', pv: ['a7a6'] },
    playedUci: 'b6b5',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['backward'] },
  },
  {
    name: 'PS3: white c2-c4 leaves d3 backward (Pe5 controls d4)',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/4p3/8/3P4/2P5/4K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    playedUci: 'c2c4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['backward'] },
  },
  {
    name: 'PS3 negative: a pawn push that leaves no backward pawns',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/2PPP3/K7 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'c2c4', pv: ['c2c4'] },
    playedUci: 'e2e4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['backward'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS4 — Hole near own king
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS4: black g7-g6 weakens dark squares around g8',
    motif: 'positional',
    source: 'synthetic (classic dark-square fianchetto hole)',
    prevFen: '6k1/5ppp/8/8/8/8/8/4K3 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'g8h8', pv: ['g8h8'] },
    playedUci: 'g7g6',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['weakens', 'around your king'] },
  },
  {
    name: 'PS4: white f2-f4 weakens e3 around g1',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/5PPP/6K1 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'g1h1', pv: ['g1h1'] },
    playedUci: 'f2f4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['weakens', 'around your king'] },
  },
  {
    name: 'PS4: white b2-b4 weakens a3/c3 around c1 (queenside castle)',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/PPP5/2K5 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'c1d2', pv: ['c1d2'] },
    playedUci: 'b2b4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['weakens', 'around your king'] },
  },
  {
    name: 'PS4 negative: a-pawn push creates no king-zone hole (king on h1)',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/P7/7K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'h1g1', pv: ['h1g1'] },
    playedUci: 'a2a4',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['weakens'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS5 — Lost castling rights
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS5: white plays Kf1 instead of O-O — gives up castling',
    motif: 'positional',
    source: 'synthetic (Italian Game-style position)',
    prevFen:
      'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    prevEval: { cp: 30, bestMoveUci: 'e1g1', pv: ['e1g1'] },
    playedUci: 'e1f1',
    currEval: { cp: -100, bestMoveUci: 'g8f6', pv: ['g8f6'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['gives up castling'] },
  },
  {
    name: 'PS5: black plays Ke7 — gives up castling',
    motif: 'positional',
    source: 'synthetic (early opening king walk)',
    prevFen:
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    prevEval: { cp: -30, bestMoveUci: 'b8c6', pv: ['b8c6'] },
    playedUci: 'e8e7',
    currEval: { cp: 100, bestMoveUci: 'f1c4', pv: ['f1c4'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['gives up castling'] },
  },
  {
    name: 'PS5: white plays Rh1-h2 — strips kingside castling',
    motif: 'positional',
    source: 'synthetic',
    prevFen:
      'rnbqkbnr/pppp1ppp/8/4p3/8/7P/PPPPPPP1/RNBQKBNR w KQkq - 0 2',
    prevEval: { cp: 20, bestMoveUci: 'e2e4', pv: ['e2e4'] },
    playedUci: 'h1h2',
    currEval: { cp: -100, bestMoveUci: 'e5e4', pv: ['e5e4'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['gives up castling'] },
  },
  {
    name: 'PS5 negative: no castling rights ever existed',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/4p3/8/8/8/8/4P3/N3K3 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'a1b3', pv: ['a1b3'] },
    playedUci: 'e1d2',
    currEval: { cp: -100, bestMoveUci: 'e7e5', pv: ['e7e5'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['castling'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS6 — Surrenders the bishop pair
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS6: white Bxf6 traded for ...gxf6 — surrenders the pair',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/6p1/5n2/6B1/8/8/8/4KB2 w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'g5e3', pv: ['g5e3'] },
    playedUci: 'g5f6',
    currEval: { cp: -100, bestMoveUci: 'g7f6', pv: ['g7f6'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['bishop pair'] },
  },
  {
    name: 'PS6: black Bxf3 traded for gxf3 — surrenders the pair',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/3b4/8/6b1/5N2/6P1/4KB2 b - - 0 1',
    prevEval: { cp: -50, bestMoveUci: 'd6c5', pv: ['d6c5'] },
    playedUci: 'g4f3',
    currEval: { cp: 100, bestMoveUci: 'g2f3', pv: ['g2f3'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['bishop pair'] },
  },
  {
    name: 'PS6: white Bxg7 trades for Kxg7 — surrenders the pair',
    motif: 'positional',
    source: 'synthetic (fianchetto exchange)',
    prevFen: '6k1/5pbp/5B2/8/8/8/8/1B2K3 w - - 0 1',
    prevEval: { cp: 30, bestMoveUci: 'f6d4', pv: ['f6d4'] },
    playedUci: 'f6g7',
    currEval: { cp: -100, bestMoveUci: 'g8g7', pv: ['g8g7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['bishop pair'] },
  },
  {
    name: 'PS6 negative: same-color bishops trade — no real "pair" lost',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/6p1/5n2/6B1/8/8/3B4/4K3 w - - 0 1',
    prevEval: { cp: 30, bestMoveUci: 'g5e3', pv: ['g5e3'] },
    playedUci: 'g5f6',
    currEval: { cp: -100, bestMoveUci: 'g7f6', pv: ['g7f6'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['bishop pair'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // PS7 — Bad bishop (locked behind own pawns)
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS7: white a2-a3 puts a 4th pawn on the dark bishop\'s color',
    motif: 'positional',
    source: 'synthetic (bad-bishop pattern)',
    prevFen: '4k3/8/8/8/8/8/PP1B1P1P/7K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'h1g1', pv: ['h1g1'] },
    playedUci: 'a2a3',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['locks', 'bishop'] },
  },
  {
    name: 'PS7: black b7-b6 puts a 4th pawn on the dark bishop\'s color',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '5b1k/pp2p1p1/8/8/8/8/8/4K3 b - - 0 1',
    prevEval: { cp: -30, bestMoveUci: 'e7e5', pv: ['e7e5'] },
    playedUci: 'b7b6',
    currEval: { cp: 100, bestMoveUci: 'e1f2', pv: ['e1f2'] },
    mover: 'b',
    category: 'mistake',
    expected: { commentContains: ['locks', 'bishop'] },
  },
  {
    name: 'PS7: white a-pawn push creates 4th pawn on dark squares',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/8/PP3P1P/2B4K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'h1g1', pv: ['h1g1'] },
    playedUci: 'a2a3',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentContains: ['locks', 'bishop'] },
  },
  {
    name: 'PS7 negative: bishop already bad in prev — pattern is not new',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/8/8/8/P7/1P3P1P/2B4K w - - 0 1',
    prevEval: { cp: 50, bestMoveUci: 'a3a4', pv: ['a3a4'] },
    playedUci: 'h1g1',
    currEval: { cp: -100, bestMoveUci: 'e8e7', pv: ['e8e7'] },
    mover: 'w',
    category: 'mistake',
    expected: { commentNotContains: ['locks'] },
  },

  // ──────────────────────────────────────────────────────────────────
  // Gate test — winDrop < 10 must keep PS silent even with the pattern
  // ──────────────────────────────────────────────────────────────────
  {
    name: 'PS gate: winDrop < 10 silences PS even when doubling occurs',
    motif: 'positional',
    source: 'synthetic',
    prevFen: '4k3/8/4p3/3n4/2P5/3P4/P7/4K3 w - - 0 1',
    prevEval: { cp: 30, bestMoveUci: 'e1f2', pv: ['e1f2', 'd5f6'] },
    playedUci: 'c4d5',
    currEval: { cp: -30, bestMoveUci: 'e6d5', pv: ['e6d5'] },
    mover: 'w',
    category: 'inaccuracy',
    expected: { commentNotContains: ['doubles'] },
  },
];
