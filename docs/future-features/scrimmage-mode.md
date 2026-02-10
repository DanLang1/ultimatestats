# Scrimmage Mode

> Future feature: Allow intra-squad scrimmages with full stat tracking on both sides.

## Problem

The current data model is built around **"My Team" vs "Other Team"**:

- `currentTeam` has a full roster; `team2Name` is just a string
- Stat entry only opens for `team1` goals (line 231-233 in `gameStore.ts`)
- Stats aggregation assumes only `team1` events have player IDs

This makes tracking stats for both sides of an intra-squad scrimmage impossible without changes.

## Current Data Model Constraints

```typescript
// team1 = full identity
currentTeam: SavedTeam; // { id, name, roster: Player[] }

// team2 = name only
team2Name: string;
```

Goal events already _support_ player IDs on both teams via the `GoalEvent` type — team2 goals just always have `null` IDs because `pendingStatEntry` is never set for them.

## Implementation Options

### Option 1: "Both Sides Track from One Roster" (Smallest Change)

Add ability for team2 goal events to record player IDs too.

- Add `isScrimmageMode: boolean` flag
- When enabled, `pendingStatEntry` fires for team2 goals as well
- Both teams draw from `currentTeam.roster`

```typescript
// Change in incrementScore:
if (isTeam1 || state.isScrimmageMode) {
  state.pendingStatEntry = { team: isTeam1 ? 'team1' : 'team2', pointNumber: newScore };
}
```

| Pros                                    | Cons                                                |
| --------------------------------------- | --------------------------------------------------- |
| Tiny change, works immediately          | No concept of "sides" for line calling              |
| Reuses all existing stat infrastructure | Doesn't prevent same player appearing on both sides |
| Half-day of work                        | No roster splitting UI                              |

---

### Option 2: "Split Roster" Approach

Keep team1/team2 structure but let team2 draw from the same roster.

- Scrimmage toggle + roster split UI during setup
- `team2` events include `goalPlayerId`/`assistPlayerId`
- Temporary side assignments stored in game state

| Pros                                 | Cons                                      |
| ------------------------------------ | ----------------------------------------- |
| Leverages existing score/event infra | Team2 still no persistent roster identity |
| Adds actual side management          | Messy to reconcile in saved games         |

---

### Option 3: Symmetric Teams (Medium Refactor)

Refactor so both teams are equal citizens:

```typescript
type TeamConfig = {
  id: string;
  name: string;
  roster: Player[];
};
```

In scrimmage, both reference subsets of the same base roster.

| Pros                                  | Cons                                          |
| ------------------------------------- | --------------------------------------------- |
| Clean symmetry                        | Significant refactor to gameStore + consumers |
| Easier stat aggregation on both sides | Migration effort for saved games              |

---

### Option 4: "Game Mode" Abstraction (Most Flexible)

Rather than team1/team2, introduce a game mode that determines data capture:

```typescript
type GameMode =
  | { type: 'vs_opponent'; myTeam: SavedTeam; opponentName: string }
  | { type: 'scrimmage'; baseTeam: SavedTeam; sideA: string[]; sideB: string[] }
  | { type: 'pickup'; allPlayers: Player[] };
```

Scoreboard UI adapts based on mode.

| Pros                                                | Cons                    |
| --------------------------------------------------- | ----------------------- |
| Most flexible, future-proofs for pickup/tournaments | Largest refactor        |
| Clean separation of concerns                        | Needs careful migration |

## Recommended Path

**Start with Option 1** as MVP to validate the feature, then evolve toward Option 3 or 4 if users find it valuable.

Key consideration: **line calling in scrimmage** — separate lines for each side means splitting the line selection UI, which pushes toward Option 2+ regardless.

## Open Questions (Need User Feedback)

- [ ] How important is roster splitting vs. just tracking stats for everyone?
- [ ] Do users want line calling during scrimmages?
- [ ] Should scrimmage games be saved differently or mixed with regular games?
- [ ] Is there demand for "pickup" style games (no persistent team at all)?
- [ ] Do users care about turnover tracking during scrimmages?

## Status

**Status:** Research / User validation needed
**Priority:** TBD based on user feedback
