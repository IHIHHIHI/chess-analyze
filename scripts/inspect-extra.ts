import { Chess } from 'chess.js';
import { readFileSync } from 'fs';
import { classifyMove, cpToWinPct, evalToCp } from '../src/engine/classify';
import { reviewMove } from '../src/engine/review';
import { buildGameModel } from '../src/game/pgn';
import { countMaterial } from '../src/engine/review/helpers';
import { NodeEngine } from './engine';

const PGN_CACHE: Record<string, string> = JSON.parse(
  readFileSync('/home/matia/chess-analyze/scripts/pgn-cache.json', 'utf8'),
);

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

const TARGETS: { url: string; ply: number }[] = [
  { url: 'https://www.chess.com/game/live/167785965812', ply: 22 },
];

async function main() {
  const engine = new NodeEngine();
  await engine.init();
  for (const tgt of TARGETS) {
    const pgn = PGN_CACHE[tgt.url];
    const game = buildGameModel({ pgn });
    const i = tgt.ply;
    const fenBefore = game.positions[i - 1];
    const move = game.moves[i - 1];
    const prev = await engine.evaluate(fenBefore, 14);
    const curr = await engine.evaluate(game.positions[i], 14);
    const cls = classifyMove({ prevEval: prev, currEval: curr, mover: move.color, playedUci: move.uci });
    const sign = move.color === 'w' ? 1 : -1;
    const winBefore = cpToWinPct(sign * evalToCp(prev));
    const winAfter = cpToWinPct(sign * evalToCp(curr));
    const REPLAY = 6;
    const bestRep = replayLine(fenBefore, prev.pv ?? [], REPLAY);
    const playedRep = replayLine(fenBefore, [move.uci, ...(curr.pv ?? [])], REPLAY);
    const lossVsBest = moverMargin(bestRep.fen, move.color) - moverMargin(playedRep.fen, move.color);
    const review = reviewMove({ prevFen: fenBefore, prevEval: prev, currEval: curr, mover: move.color, playedUci: move.uci, category: cls.category });
    console.log(`\n${tgt.url} ply ${i} ${move.color}: ${move.san} fenBefore=${fenBefore}`);
    console.log(`  cat=${cls.category} winDrop=${(winBefore-winAfter).toFixed(1)} lossVsBest=${lossVsBest.toFixed(2)}`);
    console.log(`  best=${prev.bestMoveUci} bestPv=${(prev.pv??[]).slice(0,8).join(' ')}`);
    console.log(`  playedPv=${(curr.pv??[]).slice(0,8).join(' ')}`);
    console.log(`  bestRep: ${bestRep.moves.map((m:any)=>`${m.san}${m.captured?'(x'+m.captured+')':''}`).join(' ')}`);
    console.log(`  playedRep: ${playedRep.moves.map((m:any)=>`${m.san}${m.captured?'(x'+m.captured+')':''}`).join(' ')}`);
    console.log(`  comment: ${review.comment ?? '(null)'}`);
  }
  engine.terminate();
}
main().catch(e => { console.error(e); process.exit(2); });
