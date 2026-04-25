export type Color = 'w' | 'b';

export type Category =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface MoveRecord {
  san: string;
  uci: string;
  color: Color;
  before: string;
  after: string;
}

export interface GameModel {
  startingFen: string;
  positions: string[];
  moves: MoveRecord[];
  headers: Record<string, string | null>;
}

export interface PositionEval {
  fen: string;
  depth: number;
  cp?: number;
  mate?: number;
  bestMoveUci: string | null;
  pv: string[];
}

export interface MoveAnalysis {
  category: Category;
  accuracy: number;
  winPctBefore: number;
  winPctAfter: number;
  delta: number;
  bestMoveUci: string | null;
  playedUci: string;
}
