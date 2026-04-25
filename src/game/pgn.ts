import { Chess, validateFen } from 'chess.js';
import type { GameModel, MoveRecord } from './types';

export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface BuildInput {
  pgn?: string;
  fen?: string;
}

export function buildGameModel({ pgn, fen }: BuildInput): GameModel {
  const trimmedPgn = pgn?.trim();
  const trimmedFen = fen?.trim();

  if (!trimmedPgn && !trimmedFen) {
    throw new Error('Provide a PGN or a FEN.');
  }

  const chess = new Chess();
  let startingFen = STARTING_FEN;
  let headers: Record<string, string | null> = {};

  if (trimmedPgn) {
    try {
      chess.loadPgn(trimmedPgn);
    } catch (err) {
      throw new Error(`Invalid PGN: ${(err as Error).message}`);
    }
    headers = chess.header();
    if (headers.FEN) {
      const v = validateFen(headers.FEN);
      if (!v.ok) throw new Error(`Invalid FEN in PGN headers: ${v.error}`);
      startingFen = headers.FEN;
    }
  } else if (trimmedFen) {
    const v = validateFen(trimmedFen);
    if (!v.ok) throw new Error(`Invalid FEN: ${v.error}`);
    chess.load(trimmedFen);
    startingFen = trimmedFen;
  }

  const verbose = chess.history({ verbose: true });
  const moves: MoveRecord[] = verbose.map((m) => ({
    san: m.san,
    uci: m.lan,
    color: m.color,
    before: m.before,
    after: m.after,
  }));

  const positions: string[] =
    moves.length === 0
      ? [startingFen]
      : [moves[0].before, ...moves.map((m) => m.after)];

  return { startingFen, positions, moves, headers };
}
