import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { migrateSavedGame } from '../migrations';
import { SavedGame } from '../types';

const FIXTURE_ROOT = join(__dirname, '..', '__fixtures__', 'games');

const FIXTURE_PATHS = [
  'v2/halftime-by-math.json',
  'v2/softcap-final-target.json',
  'v3/already-stamped-halftime.json',
] as const;

function loadSavedGameFixture(relativePath: (typeof FIXTURE_PATHS)[number]): SavedGame {
  const raw = readFileSync(join(FIXTURE_ROOT, relativePath), 'utf8');
  return JSON.parse(raw) as SavedGame;
}

describe('storage migration snapshots', () => {
  it.each(FIXTURE_PATHS)('migrates %s', (relativePath) => {
    const fixture = loadSavedGameFixture(relativePath);

    expect(migrateSavedGame(fixture)).toMatchSnapshot(relativePath);
  });

  it.each(FIXTURE_PATHS)('is idempotent for %s', (relativePath) => {
    const fixture = loadSavedGameFixture(relativePath);
    const migrated = migrateSavedGame(fixture);

    expect(migrateSavedGame(migrated)).toEqual(migrated);
  });
});
