# Testing Patterns

> Guidelines for testing in this codebase.

## Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- gameUtils

# Watch mode
npm test -- --watch
```

## Maestro Simulator Checks

Maestro flows live in `.maestro/` and target the installed iOS simulator build
(`com.langdk.ultimatestats` from the checked-in native project). Install Maestro with Homebrew, then
build the app and run the advanced tracker smoke check:

```bash
brew tap mobile-dev-inc/tap
brew install maestro
npm run ios
npm run maestro:smoke
```

The Maestro npm scripts set `JAVA_HOME=/opt/homebrew/opt/openjdk`, matching the OpenJDK installed by
the Maestro Homebrew formula. They also disable Maestro CLI analytics for predictable agent runs.

Use `.agent/skills/maestro-advanced-tracker/SKILL.md` before adding or extending advanced tracker
flows.

## Test File Location

Tests live in `lib/__tests__/` directory:

- `gameUtils.test.ts` - Game end logic
- `playerUtils.test.ts` - Player utilities
- `halftimeUtils.test.ts` - Halftime marker utilities
- `statsUtils.test.ts` - Stats calculations
- `timelineUtils.test.ts` - Timeline formatting
- `lib/storage/__tests__/migrations*.test.ts` - Saved-game schema migrations
- `lib/storage/__tests__/asyncStorageAdapter.test.ts` - Saved-game load/write recovery behavior
- `lib/storage/__tests__/devImport.test.ts` - Dev legacy JSON import parsing

Legacy saved-game fixtures live in `lib/storage/__fixtures__/games/`, grouped by schema version
(`v2/`, `v3/`, etc.). When adding a new migration, keep older fixtures unchanged and add new
versioned fixtures/snapshots rather than rewriting the old data.

Every saved-game schema bump requires a new migration file — even if the migration is a no-op
(only stamps the new `schemaVersion`). The migration engine asserts that all versions from the
first migration up to `CURRENT_SCHEMA_VERSION` are covered consecutively.

## Writing Tests

### Pattern

```typescript
import { functionToTest } from '../module';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    const result = functionToTest({ input: 'value' });
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    // ...
  });
});
```

### What to Test

1. **Utility functions** in `lib/` - pure functions with clear inputs/outputs
2. **Game logic** - scoring, win conditions, possession
3. **Stats calculations** - plus/minus, aggregations
4. **Edge cases** - empty arrays, null values, boundary conditions

### What NOT to Test

1. UI components - use manual verification
2. Store actions directly - test through exported utilities
3. Third-party library behavior

## Manual Verification

Some features require manual testing:

### Browser Testing

- Use the browser subagent for UI interactions
- Record flows for reference

### Build Verification

```bash
# Development build
npm run dev

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

### Test Scenarios

When testing stat tracking:

1. Score goals with/without stat tracking
2. Record turnovers of each type
3. Verify timeline shows correct events
4. Export CSV and verify data matches UI

When testing saved-game migrations:

1. In a dev build, open Dashboard and use `Import Legacy Game JSON`.
2. Paste a raw saved-game object/array or a persisted `state.savedGames` blob.
3. Confirm the games appear in Saved Games and that halftime/timeline behavior matches the migrated schema.
4. To test malformed legacy data, use `Append Raw Entries`, then `Run loadGames() Now` (or open Saved Games) and confirm only the bad entries are quarantined.
5. To test whole-blob corruption from the Dashboard, tap `Test Corrupt Blob Alert`. It writes invalid JSON to `ultimatestats_games` and opens Saved Games, which should show the corruption warning instead of silently pretending the library is empty.

When testing game end:

1. Play to game point
2. Enable soft cap, verify behavior
3. Let timer expire (hard cap)
4. Verify win modal shows correctly
