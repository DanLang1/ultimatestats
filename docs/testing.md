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

## Test File Location

Tests live in `lib/__tests__/` directory:

- `gameUtils.test.ts` - Game end logic
- `playerUtils.test.ts` - Player utilities
- `statsUtils.test.ts` - Stats calculations
- `timelineUtils.test.ts` - Timeline formatting

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

When testing game end:

1. Play to game point
2. Enable soft cap, verify behavior
3. Let timer expire (hard cap)
4. Verify win modal shows correctly
