# Gender Ratio Tracking (ABBA Prescribed Ratio Rule)

## Overview

Add a setting to track gender ratio for mixed ultimate games using the ABBA pattern:

- Point 1: Winner's chosen ratio ("A")
- Points 2-3: Reverse ratio ("B")
- Points 4-5: Back to "A"
- Points 6-7: Back to "B"
- Pattern continues: A, BB, AA, BB, AA...

Halftime does NOT impact the pattern.

## Design Decisions

- **Ratio Format**: Fixed 4W-3M / 4M-3W (standard 7v7 mixed)
- **Display Location**: Settings Bar (next to game timer)
- **Ratio Selection**: Integrated into PullPromptModal (not a separate modal)

## Files to Modify

### 1. `lib/genderRatioUtils.ts` (new file)

Utility function for ABBA calculation:

```typescript
export type GenderRatio = 'more-women' | 'more-men';

export function getExpectedRatio(pointNumber: number, firstPointRatio: GenderRatio): GenderRatio {
  if (pointNumber === 1) return firstPointRatio;

  // Points 2-3 → pair 1 (reverse)
  // Points 4-5 → pair 2 (same)
  // Points 6-7 → pair 3 (reverse)
  const pairIndex = Math.floor((pointNumber - 2) / 2) + 1;
  const isReverse = pairIndex % 2 === 1;

  if (isReverse) {
    return firstPointRatio === 'more-women' ? 'more-men' : 'more-women';
  }
  return firstPointRatio;
}

export function formatRatio(ratio: GenderRatio): string {
  return ratio === 'more-women' ? '4W-3M' : '4M-3W';
}
```

### 2. `lib/__tests__/genderRatioUtils.test.ts` (new file)

Tests for the ABBA logic:

```typescript
describe('getExpectedRatio', () => {
  describe('when first point ratio is more-women (4W-3M)', () => {
    const firstRatio: GenderRatio = 'more-women';

    it('point 1 is more-women', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-women');
    });

    it('points 2-3 are more-men (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-men');
    });

    it('points 4-5 are more-women (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-women');
    });

    it('points 6-7 are more-men (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-men');
    });

    it('continues pattern for later points', () => {
      // Points 8-9: same as first
      expect(getExpectedRatio(8, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(9, firstRatio)).toBe('more-women');
      // Points 10-11: reverse
      expect(getExpectedRatio(10, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(11, firstRatio)).toBe('more-men');
    });
  });

  describe('when first point ratio is more-men (4M-3W)', () => {
    const firstRatio: GenderRatio = 'more-men';

    it('point 1 is more-men', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-men');
    });

    it('points 2-3 are more-women (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-women');
    });

    it('points 4-5 are more-men (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-men');
    });

    it('points 6-7 are more-women (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-women');
    });
  });
});

describe('formatRatio', () => {
  it('formats more-women as 4W-3M', () => {
    expect(formatRatio('more-women')).toBe('4W-3M');
  });

  it('formats more-men as 4M-3W', () => {
    expect(formatRatio('more-men')).toBe('4M-3W');
  });
});
```

### 3. `store/settingsStore.ts` (Types and Implementation)

Add new state fields to settingsStore:

```typescript
genderRatioEnabled: boolean;
firstPointRatio: 'more-women' | 'more-men' | null;

// Actions
setGenderRatioEnabled: (enabled: boolean) => void;
setFirstPointRatio: (ratio: 'more-women' | 'more-men' | null) => void;
```

### 4. `store/settingsStore.ts`

- Add initial state: `genderRatioEnabled: false`, `firstPointRatio: null`
- Add setter actions
- Add to `resetGame()` in `gameStore` to clear `firstPointRatio` in `settingsStore`
- Add to `partialize()` for persistence

### 5. `app/Settings.tsx`

Add toggle in Game Settings section (after Point Timer):

```tsx
<Switch
  label="Gender Ratio"
  value={genderRatioEnabled}
  onValueChange={setGenderRatioEnabled}
  disabled={gameActive}
  locked={gameActive}
/>
```

### 6. `app/PullPromptModal.tsx`

Modify to have two steps when gender ratio is enabled:

1. **Step 1**: "Who is receiving?" (existing) - sets possession
2. **Step 2**: "Select ratio for Point 1" (new) - only shows if genderRatioEnabled

Changes:

- Add local state: `step: 'possession' | 'ratio'`
- When team is selected and genderRatioEnabled is true, go to step 2
- Step 2 shows two buttons: "4W-3M" and "4M-3W"
- When ratio is selected, call setFirstPointRatio and dismiss

### 7. `components/SettingsBar.tsx`

Add ratio indicator next to timer:

```tsx
{
  genderRatioEnabled && firstPointRatio && (
    <View style={styles.ratioContainer}>
      <Text style={[styles.ratioText, { color: barContentColor }]}>
        {formatRatio(getExpectedRatio(currentPoint, firstPointRatio))}
      </Text>
    </View>
  );
}
```

## Implementation Order

1. Create `lib/genderRatioUtils.ts` with utility functions
2. Create `lib/__tests__/genderRatioUtils.test.ts` with tests
3. Run tests to verify logic
4. Add state to settingsStore (types and implementation)
5. Add settings toggle in Settings.tsx
6. Modify PullPromptModal for two-step flow
7. Add ratio display to SettingsBar

## UI/UX Flow

1. User enables "Gender Ratio" in Settings (before game starts)
2. User taps team area to start game
3. PullPromptModal Step 1: "Who is receiving?" → select team
4. PullPromptModal Step 2: "Select ratio for Point 1" → select 4W-3M or 4M-3W
5. Modal closes, game starts
6. SettingsBar shows expected ratio for current point
7. Ratio automatically updates based on ABBA pattern as points are scored

## Verification

1. Run tests: `npm test -- genderRatioUtils`
2. Enable Gender Ratio in Settings
3. Start a new game, verify two-step PullPromptModal
4. Select possession, then ratio
5. Verify SettingsBar shows selected ratio
6. Score points and verify ratio alternates correctly:
   - Point 1: Selected ratio
   - Points 2-3: Opposite
   - Points 4-5: Selected
   - Points 6-7: Opposite
7. Verify halftime does NOT reset the pattern
