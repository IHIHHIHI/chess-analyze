import { detector as d1 } from './detectors/d1-discovered';
import { detector as g1 } from './detectors/g1-missed-gain';
import { detector as l1 } from './detectors/l1-hangs-material';
import { detector as m1 } from './detectors/m1-missed-mate';
import { detector as m2 } from './detectors/m2-allows-mate';
import { detector as ps } from './detectors/ps-positional';
import { detector as r1 } from './detectors/r1-remove-defender';
import { detector as s1 } from './detectors/s1-skewer';
import type { Detector, DetectorContext, Finding } from './types';

// Phase A pipeline. Phase B will splice in F1/P1/T1 in the priority order
// documented in pure-churning-clarke.md. PS (positional fallback) runs
// LAST. S1 (skewer), D1 (discovered) and R1 (remove-defender) are wired
// locally for the fixture runner; the coordinator decides the final
// tactical-tier order.
// R1 (remove-defender) is a two-move motif — placed before G1/L1 so it
// gets first shot at "missed capture" patterns it can name precisely.
// D1 sits between R1 and the generic capture fallbacks: discovered checks
// and discovered attacks deserve a named comment.
export const detectors: Detector[] = [m1, m2, s1, r1, d1, g1, l1, ps];

export function runPipeline(ctx: DetectorContext): Finding | null {
  for (const d of detectors) {
    const finding = d(ctx);
    if (finding) return finding;
  }
  return null;
}
