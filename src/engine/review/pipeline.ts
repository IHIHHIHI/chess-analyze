import { detector as d1 } from './detectors/d1-discovered';
import { detector as f1 } from './detectors/f1-fork';
import { detector as g1 } from './detectors/g1-missed-gain';
import { detector as l1 } from './detectors/l1-hangs-material';
import { detector as l2 } from './detectors/l2-net-material-loss';
import { detector as m1 } from './detectors/m1-missed-mate';
import { detector as m2 } from './detectors/m2-allows-mate';
import { detector as p1 } from './detectors/p1-pin';
import { detector as ps } from './detectors/ps-positional';
import { detector as r1 } from './detectors/r1-remove-defender';
import { detector as s1 } from './detectors/s1-skewer';
import { detector as t1 } from './detectors/t1-trapped';
import type { Detector, DetectorContext, Finding } from './types';

// Canonical priority order from pure-churning-clarke.md, refined post real-
// game audit (2026-04-25):
//
// 1. mate first (M1, M2)
// 2. two-move named tactics (R1, D1)
// 3. one-move named tactics (F1, P1, S1, T1)
// 4. generic single-capture material (G1, L1)
// 5. NET material loss across the line (L2) — catches diffuse multi-ply
//    trades that no single-capture detector can name. Without L2,
//    "by analyzing the engine line, you can easily see material difference
//    after that" cases would fall through to silence or to misleading
//    positional comments.
// 6. positional fallback (PS) — only when nothing material matched AND
//    winDrop ≥ 10
export const detectors: Detector[] = [
  m1, m2,
  r1, d1,
  f1, p1, s1, t1,
  g1, l1,
  l2,
  ps,
];

export function runPipeline(ctx: DetectorContext): Finding | null {
  for (const d of detectors) {
    const finding = d(ctx);
    if (finding) return finding;
  }
  return null;
}
