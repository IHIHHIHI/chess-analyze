// Reads scripts/analysis-output.json and produces an audit grading each
// comment against simple rules:
//   - PS firing while lossVsBest >= 1.5 → likely "material truth masked"
//   - PS firing while lossVsBest < 1.5 → likely OK as a positional explanation
//   - L1/G1 firing → spot-check the named piece appears in the played/best PV
//   - silent (no comment) on big winDrop is reported separately at end
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

interface CommentRow {
  gameUrl: string;
  ply: number;
  fenBefore: string;
  fenAfter: string;
  mover: 'w' | 'b';
  played: string;
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

interface RawOutput { depth: number; generatedAt: string; summaries: GameSummary[]; }

function classifyComment(c: CommentRow): string {
  // PS6 (bishop pair), PS5 (castling), PS1-7 etc. We have to infer the detector
  // from comment text since we didn't store the id.
  const cm = c.comment;
  if (cm.includes('Surrenders the bishop pair')) return 'PS6';
  if (cm.includes('Gives up castling')) return 'PS5';
  if (cm.includes('Doubles your pawns')) return 'PS1';
  if (cm.includes('Isolates your')) return 'PS2';
  if (cm.includes('backward')) return 'PS3';
  if (cm.includes('Weakens') && cm.includes('around your king')) return 'PS4';
  if (cm.includes('Locks your bishop')) return 'PS7';
  if (cm.startsWith('Drops the')) return 'L1';
  if (cm.includes('royal fork')) return 'F1-royal';
  if (cm.startsWith('Missed') && cm.includes('forks')) return 'F1';
  if (cm.startsWith('Missed') && cm.includes('removes the') && cm.includes('defender')) return 'R1';
  if (cm.startsWith('Missed') && cm.includes('discovered')) return 'D1';
  if (cm.startsWith('Missed') && cm.includes('pins')) return 'P1';
  if (cm.startsWith('Missed') && cm.includes('skewers')) return 'S1';
  if (cm.startsWith('Missed') && cm.includes('traps')) return 'T1';
  if (cm.startsWith('Missed') && cm.includes('wins the')) return 'G1';
  if (cm.startsWith('Missed mate')) return 'M1';
  if (cm.startsWith('Allows mate')) return 'M2';
  return 'UNKNOWN';
}

function main() {
  const inFile = path.resolve(SCRIPT_DIR, 'analysis-output.json');
  const raw: RawOutput = JSON.parse(readFileSync(inFile, 'utf8'));
  console.log(`Depth ${raw.depth}, ${raw.summaries.length} games`);

  // Buckets
  const allComments: { detector: string; row: CommentRow; gameUrl: string }[] = [];
  for (const g of raw.summaries) {
    for (const c of g.comments) {
      allComments.push({ detector: classifyComment(c), row: c, gameUrl: g.url });
    }
  }

  // Per-detector counts
  const byDet = new Map<string, typeof allComments>();
  for (const x of allComments) {
    if (!byDet.has(x.detector)) byDet.set(x.detector, []);
    byDet.get(x.detector)!.push(x);
  }
  console.log('\nDetector firings:');
  for (const [d, list] of [...byDet.entries()].sort()) {
    const psHidesMaterial = list.filter((x) => d.startsWith('PS') && x.row.lossVsBest >= 1.5).length;
    const note = psHidesMaterial > 0 ? `  (${psHidesMaterial} with lossVsBest ≥ 1.5)` : '';
    console.log(`  ${d}: ${list.length}${note}`);
  }

  // PS-fires-with-material-loss instances
  console.log('\n=== PS firings where lossVsBest >= 1.5 ===');
  for (const x of allComments) {
    if (!x.detector.startsWith('PS')) continue;
    if (x.row.lossVsBest < 1.5) continue;
    const c = x.row;
    console.log(`\n  ${c.gameUrl} ply ${c.ply} ${c.mover === 'w' ? 'W' : 'B'} ${c.played} (${c.classification}, drop ${c.winDrop.toFixed(1)}%)`);
    console.log(`    detector=${x.detector}  lossVsBest=${c.lossVsBest.toFixed(2)}  prevCp=${c.prevCpWhite}  currCp=${c.currCpWhite}`);
    console.log(`    comment: "${c.comment}"`);
    console.log(`    best: ${c.bestSan} (${c.bestMoveUci})`);
    console.log(`    bestPv: ${c.bestPv.slice(0, 8).join(' ')}`);
    console.log(`    playedPv: ${c.playedPv.slice(0, 8).join(' ')}`);
    console.log(`    fenBefore: ${c.fenBefore}`);
  }

  // Big winDrop with no PS/L1/G1 (i.e., no comment) — but our data is already
  // filtered to "comment-firing rows", so we can't see silent moves. Skip.

  // L1/G1 sanity (named piece appears in PV?)
  console.log('\n=== L1/G1 firings (sanity) ===');
  for (const x of allComments) {
    if (x.detector !== 'L1' && x.detector !== 'G1') continue;
    const c = x.row;
    console.log(`\n  ${c.gameUrl} ply ${c.ply} ${c.mover === 'w' ? 'W' : 'B'} ${c.played} (${c.classification}, drop ${c.winDrop.toFixed(1)}%)`);
    console.log(`    detector=${x.detector}  lossVsBest=${c.lossVsBest.toFixed(2)}`);
    console.log(`    comment: "${c.comment}"`);
    console.log(`    best: ${c.bestSan}  bestPv: ${c.bestPv.slice(0, 6).join(' ')}`);
    console.log(`    playedPv: ${c.playedPv.slice(0, 6).join(' ')}`);
  }

  // F1/D1/P1/S1/T1 (tactical detectors): print to verify motifs are real
  console.log('\n=== Tactical-tier firings ===');
  for (const x of allComments) {
    if (!['F1', 'F1-royal', 'D1', 'P1', 'S1', 'T1', 'R1', 'M1', 'M2'].includes(x.detector)) continue;
    const c = x.row;
    console.log(`\n  ${c.gameUrl} ply ${c.ply} ${c.mover === 'w' ? 'W' : 'B'} ${c.played} (${c.classification}, drop ${c.winDrop.toFixed(1)}%)`);
    console.log(`    detector=${x.detector}  lossVsBest=${c.lossVsBest.toFixed(2)}`);
    console.log(`    comment: "${c.comment}"`);
    console.log(`    best: ${c.bestSan}  bestPv: ${c.bestPv.slice(0, 6).join(' ')}`);
    console.log(`    fenBefore: ${c.fenBefore}`);
  }

  // Summary
  const total = allComments.length;
  const psTotal = allComments.filter(x => x.detector.startsWith('PS')).length;
  const psWithMat = allComments.filter(x => x.detector.startsWith('PS') && x.row.lossVsBest >= 1.5).length;
  console.log(`\n=== Summary ===`);
  console.log(`Total comments: ${total}`);
  console.log(`PS-tier total: ${psTotal}`);
  console.log(`PS-tier with lossVsBest ≥ 1.5: ${psWithMat} (${total ? (100 * psWithMat / total).toFixed(1) : 0}% of all comments)`);

  // Save audit JSON
  const auditOut = path.resolve(SCRIPT_DIR, 'audit-output.json');
  writeFileSync(auditOut, JSON.stringify({
    summary: { total, psTotal, psWithMat },
    detectorCounts: Object.fromEntries([...byDet.entries()].map(([d, l]) => [d, l.length])),
    allComments: allComments.map(x => ({
      detector: x.detector,
      gameUrl: x.gameUrl,
      ...x.row,
      psHidesMaterial: x.detector.startsWith('PS') && x.row.lossVsBest >= 1.5,
    })),
  }, null, 2));
  console.log(`\nWrote ${auditOut}`);
}

main();
