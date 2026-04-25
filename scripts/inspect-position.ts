// Re-runs reviewMove on specific positions and dumps all detector context
// (winDrop, lossVsBest, played/best replays) to understand why a comment
// did/didn't fire.
import { Chess } from 'chess.js';
import { readFileSync } from 'fs';
import { classifyMove, cpToWinPct, evalToCp } from '../src/engine/classify';
import { reviewMove } from '../src/engine/review';
import { buildGameModel } from '../src/game/pgn';
import { countMaterial } from '../src/engine/review/helpers';
import type { PositionEval } from '../src/game/types';
import { NodeEngine } from './engine';

const PGN_CACHE: Record<string, string> = JSON.parse(
  readFileSync('/home/matia/chess-analyze/scripts/pgn-cache.json', 'utf8'),
);

const TARGETS: { url: string; ply: number }[] = [
  { url: 'https://www.chess.com/game/live/167792044890', ply: 43 }, // silent mistake
  { url: 'https://www.chess.com/game/live/167792044890', ply: 41 }, // PS6
  { url: 'https://www.chess.com/game/live/167785965812', ply: 17 }, // L1 names harvest move
  { url: 'https://www.chess.com/game/live/167785965812', ply: 23 }, // silent
  { url: 'https://www.chess.com/game/live/167786254812', ply: 24 }, // L1 names harvest move
  { url: 'https://www.chess.com/game/live/167786091554', ply: 34 }, // silent
  { url: 'https://www.chess.com/game/live/167785965812', ply: 26 }, // silent blunder
  { url: 'https://www.chess.com/game/live/167785965812', ply: 40 }, // silent blunder
];

function moverMargin(fen: string, mover: 'w'|'b'): number {
  const m = countMaterial(fen);
  return mover === 'w' ? m.w - m.b : m.b - m.w;
}
function replayLine(startFen: string, uciList: string[], maxPlies: number) {
  const c = new Chess(); c.load(startFen);
  const moves: any[] = [];
  for (let i = 0; i < Math.min(uciList.length, maxPlies); i++) {
    const u = uciList[i];
    if (!u || u.length < 4) break;
    try {
      const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u.length>4? u.slice(4,5) : undefined });
      if (!m) break;
      moves.push(m);
    } catch { break; }
  }
  return { fen: c.fen(), moves };
}

async function main() {
  const engine = new NodeEngine();
  await engine.init();

  for (const tgt of TARGETS) {
    const pgn = PGN_CACHE[tgt.url];
    if (!pgn) { console.log('no PGN for', tgt.url); continue; }
    const game = buildGameModel({ pgn });
    const i = tgt.ply;
    if (i < 1 || i >= game.positions.length) { console.log('bad ply'); continue; }
    const fenBefore = game.positions[i - 1];
    const fenAfter = game.positions[i];
    const move = game.moves[i - 1];
    console.log('\n=================');
    console.log(`${tgt.url} ply ${i} ${move.color}: ${move.san} (${move.uci})`);
    console.log('FEN before:', fenBefore);
    console.log('FEN after :', fenAfter);
    const prev = await engine.evaluate(fenBefore, 14);
    const curr = await engine.evaluate(fenAfter, 14);
    const cls = classifyMove({ prevEval: prev, currEval: curr, mover: move.color, playedUci: move.uci });
    const sign = move.color === 'w' ? 1 : -1;
    const winBefore = cpToWinPct(sign * evalToCp(prev));
    const winAfter = cpToWinPct(sign * evalToCp(curr));
    console.log(`prevEval cp=${prev.cp} mate=${prev.mate}  winPct(mover)=${winBefore.toFixed(1)}`);
    console.log(`currEval cp=${curr.cp} mate=${curr.mate}  winPct(mover)=${winAfter.toFixed(1)}`);
    console.log(`category=${cls.category}  winDrop=${(winBefore - winAfter).toFixed(1)}`);
    console.log(`bestMoveUci=${prev.bestMoveUci}  bestPv=${(prev.pv ?? []).slice(0,8).join(' ')}`);
    console.log(`playedPv=${(curr.pv ?? []).slice(0,8).join(' ')}`);

    // Compute lossVsBest
    const REPLAY = 6;
    const bestRep = replayLine(fenBefore, prev.pv ?? [], REPLAY);
    const playedRep = replayLine(fenBefore, [move.uci, ...(curr.pv ?? [])], REPLAY);
    const lossVsBest = moverMargin(bestRep.fen, move.color) - moverMargin(playedRep.fen, move.color);
    console.log(`lossVsBest = ${lossVsBest.toFixed(2)}  (best margin ${moverMargin(bestRep.fen, move.color)} - played margin ${moverMargin(playedRep.fen, move.color)})`);
    console.log(`bestRep moves: ${bestRep.moves.map((m:any) => `${m.san}${m.captured ? '(x'+m.captured+')' : ''}`).join(' ')}`);
    console.log(`playedRep moves (after played): ${playedRep.moves.map((m:any) => `${m.san}${m.captured ? '(x'+m.captured+')' : ''}`).join(' ')}`);

    const review = reviewMove({
      prevFen: fenBefore,
      prevEval: prev,
      currEval: curr,
      mover: move.color,
      playedUci: move.uci,
      category: cls.category,
    });
    console.log(`reviewMove comment: ${review.comment ?? '(null)'}`);
  }

  engine.terminate();
}
main().catch(e => { console.error(e); process.exit(2); });
