import { detector as g1 } from './detectors/g1-missed-gain';
import { detector as l1 } from './detectors/l1-hangs-material';
import { detector as m1 } from './detectors/m1-missed-mate';
import { detector as m2 } from './detectors/m2-allows-mate';
import type { Detector, DetectorContext, Finding } from './types';

// Phase A pipeline. Phase B will splice in F1/P1/S1/D1/T1/R1/PS in the
// priority order documented in pure-churning-clarke.md.
export const detectors: Detector[] = [m1, m2, g1, l1];

export function runPipeline(ctx: DetectorContext): Finding | null {
  for (const d of detectors) {
    const finding = d(ctx);
    if (finding) return finding;
  }
  return null;
}
