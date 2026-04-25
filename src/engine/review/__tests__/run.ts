import { reviewMove } from '../index';
import type { Fixture } from '../types';
import { allFixtures } from './fixtures';
import { commentMatches, validateFixture } from './validate';

const args = process.argv.slice(2);
const motifFilter = args.find((a) => !a.startsWith('--')) ?? null;

let total = 0;
let passed = 0;
const failures: { name: string; reason: string }[] = [];
const motifCounts: Record<string, { pass: number; fail: number }> = {};

// Validate every fixture upfront — authoring errors should surface as a
// single clear failure rather than mysterious "expected fork, got null".
const validationErrors: string[] = [];
for (const f of allFixtures) {
  try {
    validateFixture(f);
  } catch (e) {
    validationErrors.push((e as Error).message);
  }
}
if (validationErrors.length > 0) {
  console.error(`\n${validationErrors.length} fixture validation error(s):`);
  for (const m of validationErrors) console.error(`  ✗ ${m}`);
  process.exit(2);
}

function fixtureToReviewInput(f: Fixture) {
  return {
    prevFen: f.prevFen,
    prevEval: {
      fen: f.prevFen,
      depth: 99,
      cp: f.prevEval.cp,
      mate: f.prevEval.mate,
      bestMoveUci: f.prevEval.bestMoveUci,
      pv: f.prevEval.pv,
      lines: [],
    },
    currEval: {
      fen: f.prevFen,
      depth: 99,
      cp: f.currEval.cp,
      mate: f.currEval.mate,
      bestMoveUci: f.currEval.bestMoveUci,
      pv: f.currEval.pv,
      lines: [],
    },
    mover: f.mover,
    playedUci: f.playedUci,
    category: f.category,
  };
}

for (const f of allFixtures) {
  if (motifFilter && f.motif !== motifFilter) continue;
  total++;
  motifCounts[f.motif] ??= { pass: 0, fail: 0 };

  const result = reviewMove(fixtureToReviewInput(f));

  if (commentMatches(result.comment, f.expected)) {
    passed++;
    motifCounts[f.motif].pass++;
  } else {
    motifCounts[f.motif].fail++;
    failures.push({
      name: f.name,
      reason: `expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(result.comment)}`,
    });
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ✗ ${f.name}: ${f.reason}`);
}

const summary = Object.entries(motifCounts)
  .map(([m, c]) => `${m}: ${c.pass}/${c.pass + c.fail}`)
  .join('  ');
console.log(
  `\n${passed}/${total} passed${motifFilter ? ` (filter: ${motifFilter})` : ''}`,
);
if (summary) console.log(summary);
process.exit(failures.length > 0 ? 1 : 0);
