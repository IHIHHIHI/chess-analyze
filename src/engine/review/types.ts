import type { Chess, Color as ChessColor, PieceSymbol, Square } from 'chess.js';
import type { Category, Color, PositionEval } from '../../game/types';

export type { PieceSymbol, Square };

export interface VerboseMove {
  san: string;
  lan: string;
  color: Color;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: string;
  before: string;
  after: string;
}

export interface ReplayResult {
  finalFen: string;
  moves: VerboseMove[];
  finalBoard: Chess;
}

export interface DetectorHelpers {
  pieceValue: (t: PieceSymbol) => number;
  pieceName: (t: PieceSymbol) => string;
  attackersOf: (board: Chess, sq: Square, color: Color) => Square[];
  defendersOf: (board: Chess, sq: Square) => Square[];
  cloneBoard: (board: Chess) => Chess;
}

interface BaseContext {
  prevEval: PositionEval;
  currEval: PositionEval;
  mover: Color;
  opponent: Color;
  sign: 1 | -1;
  played: VerboseMove;
  playedUci: string;
  category: Category;
}

export interface MateOnlyContext extends BaseContext {
  kind: 'mate-only';
}

export interface FullContext extends BaseContext {
  kind: 'full';
  prevFen: string;
  prevBoard: Chess;
  playedBoard: Chess;
  bestBoard: Chess;
  bestReplay: ReplayResult;
  playedReplay: ReplayResult;
  winDrop: number;
  lossVsBest: number;
  helpers: DetectorHelpers;
}

export type DetectorContext = MateOnlyContext | FullContext;

export interface Finding {
  id: string;
  comment: string;
}

export type Detector = (ctx: DetectorContext) => Finding | null;

export interface ReviewInput {
  prevFen: string;
  prevEval: PositionEval | null;
  currEval: PositionEval | null;
  mover: Color;
  playedUci: string;
  category: Category;
}

export interface ReviewOutput {
  comment: string | null;
}

export type FixtureMotif =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'trapped'
  | 'defender'
  | 'mate'
  | 'hangs'
  | 'gains'
  | 'silent'
  | 'positional';

export type FixtureExpectation =
  | { comment: null }
  | { commentContains: string[] }
  | { commentNotContains: string[] }
  | { commentContains: string[]; commentNotContains: string[] };

export interface Fixture {
  name: string;
  motif: FixtureMotif;
  source: string;
  prevFen: string;
  prevEval: { cp?: number; mate?: number; bestMoveUci: string; pv: string[] };
  playedUci: string;
  currEval: { cp?: number; mate?: number; bestMoveUci: string | null; pv: string[] };
  mover: Color;
  category: Category;
  expected: FixtureExpectation;
}

// Re-export the chess.js Color type as well for convenience in detectors that
// want it locally; the project Color is identical.
export type { ChessColor };
