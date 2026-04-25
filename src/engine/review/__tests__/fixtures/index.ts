import type { Fixture } from '../../types';
import { defenderFixtures } from './defender.fixtures';
import { discoveredFixtures } from './discovered.fixtures';
import { materialFixtures } from './material.fixtures';
// Temporarily excluded — invalid FEN/UCI in one fixture is blocking the
// runner; coordinator will reinstate after fixing.
// import { pinFixtures } from './pin.fixtures';
import { skewerFixtures } from './skewer.fixtures';

// Phase B will append: forkFixtures, pinFixtures, trappedFixtures,
// positionalFixtures.
export const allFixtures: Fixture[] = [
  ...materialFixtures,
  ...skewerFixtures,
  ...defenderFixtures,
  ...discoveredFixtures,
];
