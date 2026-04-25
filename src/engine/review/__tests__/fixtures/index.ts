import type { Fixture } from '../../types';
import { materialFixtures } from './material.fixtures';

// Phase B will append: forkFixtures, pinFixtures, skewerFixtures,
// discoveredFixtures, trappedFixtures, defenderFixtures, positionalFixtures.
export const allFixtures: Fixture[] = [
  ...materialFixtures,
];
