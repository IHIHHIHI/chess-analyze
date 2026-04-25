import { useCallback, useEffect, useState } from 'react';
import {
  archiveMonthLabel,
  fetchArchive,
  fetchArchives,
  type ChessComGame,
} from '../game/chesscom';
import { useStore } from '../state/store';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; user: string; archives: string[]; archiveIdx: number; games: ChessComGame[] }
  | { kind: 'error'; message: string };

const LAST_USER_KEY = 'chessReview.lastChessComUser';
const MAX_VISIBLE_GAMES = 80;

function resultOf(mine: string, theirs: string): 'win' | 'loss' | 'draw' {
  if (mine === 'win') return 'win';
  if (theirs === 'win') return 'loss';
  return 'draw';
}

function formatRelative(unix: number): string {
  const diff = Date.now() / 1000 - unix;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function terminationLabel(mine: string, theirs: string): string {
  const r = resultOf(mine, theirs);
  if (r === 'win') {
    if (theirs === 'checkmated') return 'by checkmate';
    if (theirs === 'resigned') return 'by resignation';
    if (theirs === 'timeout') return 'on time';
    if (theirs === 'abandoned') return 'by abandon';
    return '';
  }
  if (r === 'loss') {
    if (mine === 'checkmated') return 'by checkmate';
    if (mine === 'resigned') return 'by resignation';
    if (mine === 'timeout') return 'on time';
    if (mine === 'abandoned') return 'by abandon';
    return '';
  }
  if (mine === 'stalemate' || theirs === 'stalemate') return 'stalemate';
  if (mine === '50move' || theirs === '50move') return '50-move rule';
  if (mine === 'repetition' || theirs === 'repetition') return 'by repetition';
  if (mine === 'insufficient' || theirs === 'insufficient') return 'insufficient material';
  if (mine === 'agreed' || theirs === 'agreed') return 'by agreement';
  return 'drawn';
}

export function ChessComImport() {
  const importGame = useStore((s) => s.importGame);
  const startAnalysis = useStore((s) => s.startAnalysis);
  const cancelAnalysis = useStore((s) => s.cancelAnalysis);
  const status = useStore((s) => s.status);
  const depth = useStore((s) => s.depth);
  const setDepth = useStore((s) => s.setDepth);

  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(LAST_USER_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);

  const isAnalyzing = status === 'analyzing';

  const load = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPhase({ kind: 'loading' });
    try {
      const archives = await fetchArchives(trimmed);
      if (archives.length === 0) {
        setPhase({
          kind: 'error',
          message: `No public archives for "${trimmed}" on chess.com.`,
        });
        return;
      }
      const archiveIdx = archives.length - 1;
      const games = await fetchArchive(archives[archiveIdx]);
      games.sort((a, b) => b.end_time - a.end_time);
      setPhase({ kind: 'loaded', user: trimmed, archives, archiveIdx, games });
      try {
        localStorage.setItem(LAST_USER_KEY, trimmed);
      } catch {
        // non-fatal
      }
    } catch (err) {
      setPhase({ kind: 'error', message: (err as Error).message });
    }
  }, []);

  const loadPreviousMonth = useCallback(async () => {
    if (phase.kind !== 'loaded' || phase.archiveIdx <= 0) return;
    const newIdx = phase.archiveIdx - 1;
    const prev = phase;
    try {
      const moreGames = await fetchArchive(phase.archives[newIdx]);
      moreGames.sort((a, b) => b.end_time - a.end_time);
      setPhase({
        ...prev,
        archiveIdx: newIdx,
        games: [...prev.games, ...moreGames],
      });
    } catch (err) {
      setPhase({ kind: 'error', message: (err as Error).message });
    }
  }, [phase]);

  const pickGame = useCallback(
    (game: ChessComGame) => {
      setPickedUrl(game.url);
      importGame({ pgn: game.pgn });
      queueMicrotask(() => {
        const { game: g } = useStore.getState();
        if (g) void startAnalysis();
      });
    },
    [importGame, startAnalysis],
  );

  // Clear the "picked" highlight whenever a new game is loaded/reset.
  useEffect(() => {
    if (status === 'idle') setPickedUrl(null);
  }, [status]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void load(username);
    }
  };

  return (
    <div className="space-y-3 rounded bg-slate-800 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="chess.com username"
          className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-emerald-500"
          disabled={phase.kind === 'loading'}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void load(username)}
          disabled={!username.trim() || phase.kind === 'loading'}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {phase.kind === 'loading' ? 'Loading…' : 'Load'}
        </button>
      </div>

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
        {isAnalyzing && (
          <button
            type="button"
            onClick={cancelAnalysis}
            className="ml-auto rounded bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Cancel
          </button>
        )}
      </div>

      {phase.kind === 'error' && (
        <div className="rounded bg-red-900/40 p-2 text-xs text-red-200" role="alert">
          {phase.message}
        </div>
      )}

      {phase.kind === 'loaded' && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-[11px] text-slate-400">
            <span>{phase.games.length} games loaded</span>
            <span>
              through {archiveMonthLabel(phase.archives[phase.archiveIdx])}
            </span>
          </div>

          {phase.games.length === 0 ? (
            <div className="rounded bg-slate-900/60 p-3 text-xs text-slate-400">
              No games yet this month.
            </div>
          ) : (
            <ul className="max-h-[360px] space-y-1 overflow-y-auto rounded bg-slate-900/60 p-1">
              {phase.games.slice(0, MAX_VISIBLE_GAMES).map((g) => {
                const userIsWhite = g.white.username.toLowerCase() === phase.user.toLowerCase();
                const me = userIsWhite ? g.white : g.black;
                const opp = userIsWhite ? g.black : g.white;
                const r = resultOf(me.result, opp.result);
                const badgeClass =
                  r === 'win'
                    ? 'bg-cls-best text-slate-900'
                    : r === 'loss'
                      ? 'bg-cls-blunder text-slate-900'
                      : 'bg-cls-good text-slate-900';
                const picked = pickedUrl === g.url;
                return (
                  <li key={g.uuid ?? g.url}>
                    <button
                      type="button"
                      onClick={() => pickGame(g)}
                      title={`${g.time_control} · ${g.rated ? 'rated' : 'casual'} · ${terminationLabel(me.result, opp.result)}`}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                        picked ? 'bg-emerald-700/30 ring-1 ring-emerald-500/50' : 'hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-6 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${badgeClass}`}
                      >
                        {r === 'win' ? 'W' : r === 'loss' ? 'L' : '½'}
                      </span>
                      <span className="shrink-0 text-slate-500" aria-label={userIsWhite ? 'white' : 'black'}>
                        {userIsWhite ? '□' : '■'}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-slate-100">{opp.username}</span>
                        <span className="text-slate-500"> ({opp.rating})</span>
                      </span>
                      <span className="shrink-0 capitalize text-slate-400">{g.time_class}</span>
                      <span className="shrink-0 font-mono text-slate-500">{formatRelative(g.end_time)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {phase.archiveIdx > 0 && (
            <button
              type="button"
              onClick={() => void loadPreviousMonth()}
              className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              Load previous month ({archiveMonthLabel(phase.archives[phase.archiveIdx - 1])})
            </button>
          )}
        </div>
      )}

      {phase.kind === 'idle' && (
        <div className="text-xs text-slate-500">
          Enter your chess.com handle and press Load. Click any game to analyse it.
        </div>
      )}
    </div>
  );
}
