import { Chess } from 'chess.js';
import { writeFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
import { classifyMove } from '../src/engine/classify';
import { reviewMove } from '../src/engine/review';
import { countMaterial } from '../src/engine/review/helpers';
import { buildGameModel } from '../src/game/pgn';
import type { GameModel, MoveAnalysis, PositionEval } from '../src/game/types';
import { NodeEngine } from './engine';

const USERNAME = (process.env.USERNAME ?? 'ihihhihi').toLowerCase();
const USER_AGENT = 'chess-review-investigation';
const DEPTH = 14;
const MAX_GAMES = parseInt(process.env.MAX_GAMES ?? '4', 10);
const REQUEST_DELAY_MS = 1000;

interface ChessComArchives { archives: string[] }
interface ChessComGame {
  url: string;
  pgn: string;
  time_class: string;
  time_control: string;
  rules: string;
  rated: boolean;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
  end_time?: number;
}
interface ChessComArchive { games: ChessComGame[] }

interface CommentRow {
  gameUrl: string;
  ply: number;
  fenBefore: string;
  fenAfter: string;
  mover: 'w' | 'b';
  played: string; // SAN
  playedUci: string;
  classification: string;
  winDrop: number;
  comment: string;
  bestMoveUci: string | null;
  bestSan: string | null;
  bestPv: string[];
  playedPv: string[];
  prevCpWhite: number | null;
  prevMate: number | null;
  currCpWhite: number | null;
  currMate: number | null;
  lossVsBest: number;
}

interface GameSummary {
  url: string;
  endTime: string;
  result: string;
  white: string;
  whiteRating: number;
  black: string;
  blackRating: number;
  timeControl: string;
  timeClass: string;
  numPositions: number;
  comments: CommentRow[];
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

function isStandard(g: ChessComGame): boolean {
  if (g.rules !== 'chess') return false;
  // Allow blitz/rapid; bullet (60 sec) is too noisy but the user said
  // "rapid/blitz are fine" — anything not bullet is fine. Filter very fast.
  const tc = g.time_control;
  const base = parseInt(tc.split('+')[0], 10);
  if (Number.isNaN(base)) return true;
  // Skip ≤ 60s base (bullet). 120s+ is OK.
  return base >= 120;
}

async function pickRecentGames(): Promise<ChessComGame[]> {
  const archivesUrl = `https://api.chess.com/pub/player/${USERNAME}/games/archives`;
  const archs = await fetchJson<ChessComArchives>(archivesUrl);
  const recent = archs.archives.slice(-2); // most recent 2 monthly archives
  const allGames: ChessComGame[] = [];
  for (const u of recent) {
    await sleep(REQUEST_DELAY_MS);
    const arch = await fetchJson<ChessComArchive>(u);
    allGames.push(...arch.games);
  }
  // Sort by end_time (or by archive order as fallback) descending
  allGames.sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0));
  const filtered = allGames.filter(isStandard);
  return filtered.slice(0, MAX_GAMES);
}

function moverMargin(fen: string, mover: 'w' | 'b'): number {
  const m = countMaterial(fen);
  return mover === 'w' ? m.w - m.b : m.b - m.w;
}

function replayLine(startFen: string, uciList: string[], maxPlies: number): string {
  const c = new Chess();
  c.load(startFen);
  const limit = Math.min(uciList.length, maxPlies);
  for (let i = 0; i < limit; i++) {
    const uci = uciList[i];
    if (!uci || uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    try {
      const r = c.move(promotion ? { from, to, promotion } : { from, to });
      if (!r) break;
    } catch {
      break;
    }
  }
  return c.fen();
}

function lossVsBestFor(prevFen: string, mover: 'w' | 'b', bestPv: string[], playedUci: string, playedPv: string[]): number {
  if (bestPv.length === 0) return 0;
  const REPLAY = 6;
  const bestFinal = replayLine(prevFen, bestPv, REPLAY);
  const playedFinal = replayLine(prevFen, [playedUci, ...playedPv], REPLAY);
  return moverMargin(bestFinal, mover) - moverMargin(playedFinal, mover);
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess();
    c.load(fen);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    });
    return m ? m.san : null;
  } catch {
    return null;
  }
}

async function analyzeGame(engine: NodeEngine, g: ChessComGame): Promise<GameSummary> {
  let game: GameModel;
  try {
    game = buildGameModel({ pgn: g.pgn });
  } catch (e) {
    throw new Error(`Failed to parse PGN for ${g.url}: ${(e as Error).message}`);
  }

  const positions = game.positions;
  const moves = game.moves;
  console.error(`  ${g.url} — ${positions.length} positions / ${moves.length} moves`);

  const evals: (PositionEval | null)[] = new Array(positions.length).fill(null);
  for (let i = 0; i < positions.length; i++) {
    try {
      evals[i] = await engine.evaluate(positions[i], DEPTH);
    } catch (e) {
      console.error(`    ply ${i} eval failed: ${(e as Error).message}`);
      evals[i] = null;
    }
    if (i % 10 === 0) console.error(`    progress ${i}/${positions.length}`);
  }

  const comments: CommentRow[] = [];
  for (let i = 1; i < positions.length; i++) {
    const prev = evals[i - 1];
    const curr = evals[i];
    const move = moves[i - 1];
    if (!prev || !curr || !move) continue;
    const cls: MoveAnalysis = classifyMove({
      prevEval: prev,
      currEval: curr,
      mover: move.color,
      playedUci: move.uci,
    });
    const review = reviewMove({
      prevFen: positions[i - 1],
      prevEval: prev,
      currEval: curr,
      mover: move.color,
      playedUci: move.uci,
      category: cls.category,
    });
    if (!review.comment) continue;

    const winDrop = cls.winPctBefore - cls.winPctAfter;
    const bestMoveUci = prev.bestMoveUci;
    const bestSan = bestMoveUci ? uciToSan(positions[i - 1], bestMoveUci) : null;
    const lossVsBest = bestMoveUci
      ? lossVsBestFor(positions[i - 1], move.color, prev.pv ?? [], move.uci, curr.pv ?? [])
      : 0;
    comments.push({
      gameUrl: g.url,
      ply: i,
      fenBefore: positions[i - 1],
      fenAfter: positions[i],
      mover: move.color,
      played: move.san,
      playedUci: move.uci,
      classification: cls.category,
      winDrop,
      comment: review.comment,
      bestMoveUci,
      bestSan,
      bestPv: prev.pv ?? [],
      playedPv: curr.pv ?? [],
      prevCpWhite: prev.cp ?? null,
      prevMate: prev.mate ?? null,
      currCpWhite: curr.cp ?? null,
      currMate: curr.mate ?? null,
      lossVsBest,
    });
  }

  const result = `${g.white.result} / ${g.black.result}`;
  const endTime = g.end_time ? new Date(g.end_time * 1000).toISOString() : '';
  return {
    url: g.url,
    endTime,
    result,
    white: g.white.username,
    whiteRating: g.white.rating,
    black: g.black.username,
    blackRating: g.black.rating,
    timeControl: g.time_control,
    timeClass: g.time_class,
    numPositions: positions.length,
    comments,
  };
}

async function main() {
  console.error(`Fetching recent games for ${USERNAME}...`);
  const games = await pickRecentGames();
  console.error(`Selected ${games.length} games:`);
  for (const g of games) {
    console.error(`  ${g.url}  ${g.time_control} ${g.time_class}  ${g.white.username} vs ${g.black.username}`);
  }

  console.error('Booting Stockfish...');
  const engine = new NodeEngine();
  await engine.init();
  console.error('Engine ready, depth =', DEPTH);

  const summaries: GameSummary[] = [];
  // Write incrementally so we don't lose data on crash.
  const outFile = path.resolve(
    SCRIPT_DIR,
    process.env.OUTPUT_FILE ?? `analysis-output-${USERNAME}.json`,
  );
  for (const g of games) {
    console.error(`\nAnalyzing ${g.url}`);
    try {
      const s = await analyzeGame(engine, g);
      summaries.push(s);
    } catch (e) {
      console.error(`  failed: ${(e as Error).message}`);
    }
    // Flush after each game.
    writeFileSync(outFile, JSON.stringify({ depth: DEPTH, generatedAt: new Date().toISOString(), summaries }, null, 2));
  }
  engine.terminate();
  writeFileSync(outFile, JSON.stringify({ depth: DEPTH, generatedAt: new Date().toISOString(), summaries }, null, 2));
  console.error(`\nWrote ${outFile} with ${summaries.length} games`);

  // Also pretty-print per-game summary to stdout
  for (const s of summaries) {
    console.log('\n=== ', s.url, ' ===');
    console.log(`  ${s.white} (${s.whiteRating}) vs ${s.black} (${s.blackRating}); ${s.timeControl} ${s.timeClass}; result: ${s.result}; positions: ${s.numPositions}`);
    console.log(`  comments: ${s.comments.length}`);
    for (const c of s.comments) {
      console.log(`    ply ${c.ply} ${c.mover === 'w' ? 'W' : 'B'} ${c.played} (${c.classification}, drop ${c.winDrop.toFixed(1)}%) [lossVsBest ${c.lossVsBest.toFixed(1)}]: ${c.comment}`);
      console.log(`      best=${c.bestSan ?? '?'} (${c.bestMoveUci ?? '?'})  fenBefore=${c.fenBefore}`);
    }
  }
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(2);
});
