import type { Fixture } from '../../types';
import { defenderFixtures } from './defender.fixtures';
import { discoveredFixtures } from './discovered.fixtures';
import { forkFixtures } from './fork.fixtures';
import { materialFixtures } from './material.fixtures';
import { pinFixtures } from './pin.fixtures';
import { positionalFixtures } from './positional.fixtures';
import { realGameFixtures } from './real-games.fixtures';
import { skewerFixtures } from './skewer.fixtures';
import { trappedFixtures } from './trapped.fixtures';

export const allFixtures: Fixture[] = [
  ...materialFixtures,
  ...forkFixtures,
  ...pinFixtures,
  ...skewerFixtures,
  ...discoveredFixtures,
  ...trappedFixtures,
  ...defenderFixtures,
  ...positionalFixtures,
  ...realGameFixtures,
];
