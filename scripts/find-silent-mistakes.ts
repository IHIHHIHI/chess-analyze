// Re-runs the review pipeline on the cached analysis-output.json positions to
// find moves with winDrop >= 10 that produced NO comment. We need access to
// per-ply evals + classifications, so we re-derive from the raw output where
// possible. Limitation: analysis-output.json only stored per-comment rows, so
// we need to re-run analyzeGame... or store per-ply evals upfront.
//
// Simpler: the analyzer already filtered to comment-firing rows. Add a second
// pass that re-runs the engine ONLY on a tiny number of positions of interest.
// Since we can't easily reverse, just re-run with a smaller depth that retains
// every classification + comment. Add a flag to keep all classifications.
import { Chess } from 'chess.js';
import { writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { classifyMove } from '../src/engine/classify';
import { reviewMove } from '../src/engine/review';
import { buildGameModel } from '../src/game/pgn';
import type { GameModel, MoveAnalysis, PositionEval } from '../src/game/types';
import { NodeEngine } from './engine';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEPTH = 14;
const PGN_CACHE: Record<string, string> = JSON.parse(readFileSync(path.resolve(SCRIPT_DIR, 'pgn-cache.json'), 'utf8'));

interface SilentRow {
  gameUrl: string;
  ply: number;
  fenBefore: string;
  mover: 'w' | 'b';
  played: string;
  playedUci: string;
  classification: string;
  winDrop: number;
  bestMoveUci: string | null;
  bestSan: string | null;
  bestPv: string[];
  prevCpWhite: number | null;
  prevMate: number | null;
  currCpWhite: number | null;
  currMate: number | null;
}

async function main() {
  const engine = new NodeEngine();
  await engine.init();

  const silents: SilentRow[] = [];
  for (const [url, pgn] of Object.entries(PGN_CACHE)) {
    console.error(`\nScanning ${url}`);
    let game: GameModel;
    try { game = buildGameModel({ pgn }); } catch { continue; }

    const evals: (PositionEval | null)[] = [];
    for (let i = 0; i < game.positions.length; i++) {
      try { evals.push(await engine.evaluate(game.positions[i], DEPTH)); }
      catch { evals.push(null); }
      if (i % 15 === 0) console.error(`  ${i}/${game.positions.length}`);
    }

    for (let i = 1; i < game.positions.length; i++) {
      const prev = evals[i - 1];
      const curr = evals[i];
      const move = game.moves[i - 1];
      if (!prev || !curr || !move) continue;
      const cls: MoveAnalysis = classifyMove({ prevEval: prev, currEval: curr, mover: move.color, playedUci: move.uci });
      if (cls.delta < 10) continue;
      const review = reviewMove({ prevFen: game.positions[i - 1], prevEval: prev, currEval: curr, mover: move.color, playedUci: move.uci, category: cls.category });
      if (review.comment) continue;
      const bestUci = prev.bestMoveUci;
      let bestSan: string | null = null;
      if (bestUci) {
        const c = new Chess(); c.load(game.positions[i - 1]);
        try {
          const m = c.move({ from: bestUci.slice(0,2), to: bestUci.slice(2,4), promotion: bestUci.length>4? bestUci.slice(4,5) : undefined });
          bestSan = m ? m.san : null;
        } catch {}
      }
      silents.push({
        gameUrl: url,
        ply: i,
        fenBefore: game.positions[i - 1],
        mover: move.color,
        played: move.san,
        playedUci: move.uci,
        classification: cls.category,
        winDrop: cls.delta,
        bestMoveUci: bestUci,
        bestSan,
        bestPv: prev.pv ?? [],
        prevCpWhite: prev.cp ?? null,
        prevMate: prev.mate ?? null,
        currCpWhite: curr.cp ?? null,
        currMate: curr.mate ?? null,
      });
    }
  }
  engine.terminate();

  const outFile = path.resolve(SCRIPT_DIR, 'silent-mistakes.json');
  writeFileSync(outFile, JSON.stringify({ silents }, null, 2));
  console.log(`\nWrote ${outFile} with ${silents.length} silent mistakes (winDrop ≥ 10, no comment)`);
  for (const s of silents) {
    console.log(`\n  ${s.gameUrl} ply ${s.ply} ${s.mover === 'w' ? 'W' : 'B'} ${s.played} (${s.classification}, drop ${s.winDrop.toFixed(1)}%)`);
    console.log(`    best=${s.bestSan ?? '?'} (${s.bestMoveUci ?? '?'})  bestPv=${s.bestPv.slice(0, 6).join(' ')}`);
    console.log(`    fenBefore=${s.fenBefore}`);
  }
}
main().catch(e => { console.error(e); process.exit(2); });
