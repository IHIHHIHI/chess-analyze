import type { Fixture } from '../../types';
import { defenderFixtures } from './defender.fixtures';
import { discoveredFixtures } from './discovered.fixtures';
import { materialFixtures } from './material.fixtures';
// Temporarily excluded — invalid FEN/UCI in one fixture is blocking the
// runner; coordinator will reinstate after fixing.
// import { pinFixtures } from './pin.fixtures';
import { skewerFixtures } from './skewer.fixtures';
import { trappedFixtures } from './trapped.fixtures';

// Phase B will append: forkFixtures, pinFixtures, positionalFixtures.
export const allFixtures: Fixture[] = [
  ...materialFixtures,
  ...skewerFixtures,
  ...defenderFixtures,
  ...discoveredFixtures,
  ...trappedFixtures,
];
