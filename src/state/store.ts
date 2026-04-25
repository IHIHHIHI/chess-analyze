import { Chess } from 'chess.js';
import { create } from 'zustand';
import { Engine } from '../engine/stockfish';
import { classifyMove } from '../engine/classify';
import { buildGameModel } from '../game/pgn';
import type {
  ExplorationMove,
  ExplorationState,
  GameModel,
  MoveAnalysis,
  PositionEval,
} from '../game/types';

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
  exploration: ExplorationState | null;

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

  tryUserMove: (input: { from: string; to: string; promotion?: string }) => boolean;
  undoExplorationMove: () => void;
  exitExploration: () => void;
  truncateExploration: (toLength: number) => void;
}

let engine: Engine | null = null;
let runId = 0;

let exploreEngine: Engine | null = null;
let exploreRunId = 0;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function terminateExploreEngine() {
  exploreRunId++;
  if (exploreEngine) {
    exploreEngine.terminate();
    exploreEngine = null;
  }
}

export const useStore = create<State>((set, get) => {
  // Tip = the position currently displayed when the variation is non-empty.
  // Lazily analyses[lastIndex] is filled in by analyzeExplorationTip.
  async function analyzeExplorationTip() {
    const pre = get().exploration;
    if (!pre || pre.line.length === 0) return;
    const preTipIdx = pre.line.length - 1;
    const cached = pre.analyses[preTipIdx];
    if (cached && cached.depth >= get().depth) return;

    const myRunId = ++exploreRunId;

    if (exploreEngine) {
      try {
        await exploreEngine.abortCurrent();
      } catch {
        // ignore — abort is best-effort
      }
    } else {
      exploreEngine = new Engine();
    }
    if (myRunId !== exploreRunId) return;

    const exp = get().exploration;
    if (!exp || exp.line.length === 0) return;
    const tipIdx = exp.line.length - 1;
    const fen = exp.line[tipIdx].fenAfter;

    set({ exploration: { ...exp, analyzing: true, analyzeError: null } });

    try {
      const result = await exploreEngine.evaluate(fen, get().depth);
      if (myRunId !== exploreRunId) return;
      const cur = get().exploration;
      if (!cur) return;
      // Make sure the tip we analyzed is still the tip of the current line.
      if (cur.line.length === 0) return;
      const curTipIdx = cur.line.length - 1;
      if (cur.line[curTipIdx].fenAfter !== fen) return;
      const newAnalyses = cur.analyses.slice();
      newAnalyses[curTipIdx] = result;
      set({ exploration: { ...cur, analyses: newAnalyses, analyzing: false } });
    } catch (err) {
      if (myRunId !== exploreRunId) return;
      const cur = get().exploration;
      if (!cur) return;
      set({
        exploration: { ...cur, analyzing: false, analyzeError: (err as Error).message },
      });
    }
  }

  function clearExploration() {
    exploreRunId++;
    if (exploreEngine) {
      void exploreEngine.abortCurrent().catch(() => {});
    }
    if (get().exploration !== null) set({ exploration: null });
  }

  return {
    game: null,
    analyses: [],
    classifications: [],
    ply: 0,
    orientation: 'white',
    depth: 14,
    status: 'idle',
    progress: { done: 0, total: 0 },
    error: null,
    exploration: null,

    importGame: ({ pgn, fen }) => {
      get().cancelAnalysis();
      terminateExploreEngine();
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
          exploration: null,
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
          exploration: null,
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
      clearExploration();
      set({ ply: clamp(ply, 0, game.positions.length - 1) });
    },
    next: () => {
      if (get().exploration) return;
      get().setPly(get().ply + 1);
    },
    prev: () => {
      if (get().exploration) {
        get().undoExplorationMove();
        return;
      }
      get().setPly(get().ply - 1);
    },
    first: () => get().setPly(0),
    last: () => {
      const game = get().game;
      if (game) get().setPly(game.positions.length - 1);
    },
    flip: () => set({ orientation: get().orientation === 'white' ? 'black' : 'white' }),
    setDepth: (depth) => set({ depth }),

    reset: () => {
      get().cancelAnalysis();
      terminateExploreEngine();
      set({
        game: null,
        analyses: [],
        classifications: [],
        ply: 0,
        status: 'idle',
        progress: { done: 0, total: 0 },
        error: null,
        exploration: null,
      });
    },

    tryUserMove: ({ from, to, promotion }) => {
      const { game, exploration, ply } = get();
      if (!game) return false;

      const baseFen =
        exploration && exploration.line.length > 0
          ? exploration.line[exploration.line.length - 1].fenAfter
          : game.positions[exploration?.rootPly ?? ply];

      const chess = new Chess();
      try {
        chess.load(baseFen);
      } catch {
        return false;
      }

      let moveResult: ReturnType<Chess['move']>;
      try {
        moveResult = chess.move({ from, to, promotion: promotion ?? 'q' });
      } catch {
        return false;
      }
      if (!moveResult) return false;

      const newMove: ExplorationMove = {
        san: moveResult.san,
        uci: moveResult.lan,
        color: moveResult.color,
        fenAfter: chess.fen(),
      };

      const next: ExplorationState = exploration
        ? {
            ...exploration,
            line: [...exploration.line, newMove],
            analyses: [...exploration.analyses, null],
            analyzeError: null,
          }
        : {
            rootPly: ply,
            line: [newMove],
            analyses: [null],
            analyzing: false,
            analyzeError: null,
          };

      set({ exploration: next });
      void analyzeExplorationTip();
      return true;
    },

    undoExplorationMove: () => {
      const exp = get().exploration;
      if (!exp) return;
      if (exp.line.length <= 1) {
        clearExploration();
        return;
      }
      const newLine = exp.line.slice(0, -1);
      const newAnalyses = exp.analyses.slice(0, -1);
      set({
        exploration: {
          ...exp,
          line: newLine,
          analyses: newAnalyses,
          analyzeError: null,
        },
      });
      void analyzeExplorationTip();
    },

    exitExploration: () => {
      clearExploration();
    },

    truncateExploration: (toLength) => {
      const exp = get().exploration;
      if (!exp) return;
      const target = clamp(toLength, 0, exp.line.length);
      if (target === 0) {
        clearExploration();
        return;
      }
      if (target === exp.line.length) return;
      set({
        exploration: {
          ...exp,
          line: exp.line.slice(0, target),
          analyses: exp.analyses.slice(0, target),
          analyzeError: null,
        },
      });
      void analyzeExplorationTip();
    },
  };
});
