import { create } from 'zustand';
import { Engine } from '../engine/stockfish';
import { classifyMove } from '../engine/classify';
import { buildGameModel } from '../game/pgn';
import type { GameModel, MoveAnalysis, PositionEval } from '../game/types';

export type Status = 'idle' | 'analyzing' | 'done' | 'error';

interface State {
  game: GameModel | null;
  analyses: (PositionEval | null)[];
  classifications: (MoveAnalysis | null)[];
  ply: number;
  orientation: 'white' | 'black';
  depth: number;
  status: Status;
  progress: { done: number; total: number };
  error: string | null;

  importGame: (input: { pgn?: string; fen?: string }) => void;
  startAnalysis: () => Promise<void>;
  cancelAnalysis: () => void;
  setPly: (ply: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  flip: () => void;
  setDepth: (depth: number) => void;
  reset: () => void;
}

let engine: Engine | null = null;
let runId = 0;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export const useStore = create<State>((set, get) => ({
  game: null,
  analyses: [],
  classifications: [],
  ply: 0,
  orientation: 'white',
  depth: 14,
  status: 'idle',
  progress: { done: 0, total: 0 },
  error: null,

  importGame: ({ pgn, fen }) => {
    get().cancelAnalysis();
    try {
      const game = buildGameModel({ pgn, fen });
      set({
        game,
        analyses: new Array(game.positions.length).fill(null),
        classifications: new Array(game.moves.length).fill(null),
        ply: 0,
        status: 'idle',
        progress: { done: 0, total: game.positions.length },
        error: null,
      });
    } catch (err) {
      set({
        game: null,
        analyses: [],
        classifications: [],
        ply: 0,
        status: 'error',
        progress: { done: 0, total: 0 },
        error: (err as Error).message,
      });
    }
  },

  startAnalysis: async () => {
    const { game, depth } = get();
    if (!game) return;

    get().cancelAnalysis();

    const myRunId = ++runId;
    const localEngine = new Engine();
    engine = localEngine;

    set({
      status: 'analyzing',
      progress: { done: 0, total: game.positions.length },
      analyses: new Array(game.positions.length).fill(null),
      classifications: new Array(game.moves.length).fill(null),
      error: null,
    });

    try {
      for (let i = 0; i < game.positions.length; i++) {
        if (myRunId !== runId) return;
        const fen = game.positions[i];
        const evaluation = await localEngine.evaluate(fen, depth);
        if (myRunId !== runId) return;

        const analyses = get().analyses.slice();
        analyses[i] = evaluation;

        const classifications = get().classifications.slice();
        if (i >= 1) {
          const prev = analyses[i - 1];
          const move = game.moves[i - 1];
          if (prev && move) {
            classifications[i - 1] = classifyMove({
              prevEval: prev,
              currEval: evaluation,
              mover: move.color,
              playedUci: move.uci,
            });
          }
        }

        set({
          analyses,
          classifications,
          progress: { done: i + 1, total: game.positions.length },
        });
      }

      if (myRunId === runId) set({ status: 'done' });
    } catch (err) {
      if (myRunId === runId) {
        set({ status: 'error', error: (err as Error).message });
      }
    } finally {
      if (engine === localEngine) {
        localEngine.terminate();
        engine = null;
      }
    }
  },

  cancelAnalysis: () => {
    runId++;
    if (engine) {
      engine.terminate();
      engine = null;
    }
    if (get().status === 'analyzing') set({ status: 'idle' });
  },

  setPly: (ply) => {
    const game = get().game;
    if (!game) return;
    set({ ply: clamp(ply, 0, game.positions.length - 1) });
  },
  next: () => get().setPly(get().ply + 1),
  prev: () => get().setPly(get().ply - 1),
  first: () => get().setPly(0),
  last: () => {
    const game = get().game;
    if (game) get().setPly(game.positions.length - 1);
  },
  flip: () => set({ orientation: get().orientation === 'white' ? 'black' : 'white' }),
  setDepth: (depth) => set({ depth }),

  reset: () => {
    get().cancelAnalysis();
    set({
      game: null,
      analyses: [],
      classifications: [],
      ply: 0,
      status: 'idle',
      progress: { done: 0, total: 0 },
      error: null,
    });
  },
}));
