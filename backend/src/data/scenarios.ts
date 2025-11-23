import { Scenario } from '../../../shared/types';

export const createNewScenario = (): Omit<
  Scenario,
  'id' | 'name' | 'difficulty'
> => ({
  mapLayout: [],
  monsterGroups: [],
  playerStartPositions: {},
  objectivePrimary: '',
});
