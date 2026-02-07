# Data Structure Decisions

> This document captures key architectural decisions regarding the data model, specifically the structure of saved games.

## SavedGame Structure: Flat vs. Nested Points

**Date:** 2026-02-06
**Context:** The application currently uses a flat stream of `GameEvent` objects for simplicity and ease of append-only logging during live gameplay. As features grow (viewing specific point stats, editing past events), this structure shows limitations.

### Current Approach: Flat Stream (Schema v2)

The `SavedGame` interface stores all events in a single chronological array:

```typescript
interface SavedGame {
  events: GameEvent[]; // [Goal, Timeout, Turnover, Goal, ...]
  pointStartTimestamps: Record<number, number>; // Maps point # to start time
  pointLines: PointLineRecord[]; // Maps point # to line played
}
```

#### Pros

- **Simplicity:** Extremely easy to collect data during a game. Just `.push()` to the array.
- **State Reconstruction:** Replaying the game state is a simple reduction over the array.
- **UI Performance:** React renders updates very efficiently with append-only lists.

#### Cons

- **Query Complexity:** To find "What happened in Point 3?", you must replay the entire event stream from the beginning to count goals and determine point boundaries.
- **Fragility:** If a single `goal` event is missing or malformed, all subsequent events are shifted to the wrong point number.
- **Edit Difficulty:** Deleting or moving a point requires complex logic to splice the array and re-sync the separate `pointLines` and `pointStartTimestamps` maps.

### Proposed Approach: Nested Point Objects (Schema v3)

A potential future refactor involves encapsulating each point into a self-contained object:

```typescript
interface SavedPoint {
  pointNumber: number;
  startTime: number;
  endTime?: number;
  line: string[]; // Roster on field for this point
  scoreBefore: { team1: number; team2: number };
  events: GameEvent[]; // Events specifically for THIS point
}

interface SavedGame {
  // ... global metadata ...
  points: SavedPoint[];
}
```

#### Pros

- **Encapsulation:** `game.points[2]` contains _everything_ about Point 3. No external dependencies.
- **Querying:** Trivial to show stats for a specific point.
- **Robustness:** A corruption in Point 2 does not affect the data integrity of Point 3.
- **Editing:** Deleting a point is as simple as removing an item from the `points` array.

#### Cons

- **Migration Cost:** Requires writing a reliable converter from v2 (flat) to v3 (nested).
- **Complexity:** The live game store might still need a flat list for UI reasons, requiring transformation on save/load.

### Decision & Recommendation

**Status:** The flat structure (v2) is retained for now to maintain velocity, but the nested structure (v3) is the recommended long-term target.

**Immediate Mitigation:**
To improve querying without a full refactor, we can add `pointNumber` to every `GameEvent`:

```typescript
export type GameEvent = {
  // ... existing fields
  pointNumber: number; // Explicit link to the point
};
```

This hybrid approach solves the "Querying" and "Stability" issues while preserving the simple flat structure for the store.
