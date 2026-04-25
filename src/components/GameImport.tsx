import { useState } from 'react';
import { useStore } from '../state/store';

type Mode = 'pgn' | 'fen';

const SAMPLE_PGN = `[Event "Sample"]
[White "Foolish"]
[Black "Patient"]

1. f3 e5 2. g4 Qh4# 0-1`;

const SAMPLE_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3';

export function GameImport() {
  const importGame = useStore((s) => s.importGame);
  const startAnalysis = useStore((s) => s.startAnalysis);
  const cancelAnalysis = useStore((s) => s.cancelAnalysis);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const game = useStore((s) => s.game);
  const depth = useStore((s) => s.depth);
  const setDepth = useStore((s) => s.setDepth);

  const [mode, setMode] = useState<Mode>('pgn');
  const [text, setText] = useState('');

  const onAnalyze = async () => {
    importGame(mode === 'pgn' ? { pgn: text } : { fen: text });
    // Allow zustand to flush the import before kicking off analysis.
    queueMicrotask(() => {
      const { game: g } = useStore.getState();
      if (g) void startAnalysis();
    });
  };

  const loadSample = () => setText(mode === 'pgn' ? SAMPLE_PGN : SAMPLE_FEN);

  const isAnalyzing = status === 'analyzing';

  return (
    <div className="space-y-3 rounded bg-slate-800 p-4">
      <div className="flex items-center gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            checked={mode === 'pgn'}
            onChange={() => setMode('pgn')}
            className="accent-emerald-500"
          />
          PGN
        </label>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            checked={mode === 'fen'}
            onChange={() => setMode('fen')}
            className="accent-emerald-500"
          />
          FEN
        </label>
        <button
          type="button"
          onClick={loadSample}
          className="ml-auto text-xs text-emerald-400 hover:underline"
        >
          load sample
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          mode === 'pgn'
            ? 'Paste PGN here. Headers with [SetUp "1"] [FEN "..."] are supported.'
            : 'Paste a FEN string here.'
        }
        rows={mode === 'pgn' ? 8 : 3}
        className="w-full resize-y rounded bg-slate-900 p-2 font-mono text-xs text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-emerald-500"
      />

      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-300">Depth</span>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            disabled={isAnalyzing}
            className="rounded bg-slate-900 px-2 py-1 text-slate-100 ring-1 ring-slate-700"
          >
            <option value={10}>10 (fast)</option>
            <option value={14}>14</option>
            <option value={18}>18</option>
            <option value={22}>22 (deep)</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="ml-auto rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Analyze
        </button>
        {isAnalyzing && (
          <button
            type="button"
            onClick={cancelAnalysis}
            className="rounded bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="rounded bg-red-900/40 p-2 text-xs text-red-200" role="alert">
          {error}
        </div>
      )}
      {!error && game && status === 'done' && (
        <div className="text-xs text-slate-400">
          Loaded {game.moves.length === 0 ? '1 position' : `${game.moves.length} plies`}.
        </div>
      )}
    </div>
  );
}
