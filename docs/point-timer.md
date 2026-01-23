# Point Timer

> Design documentation for the point timing and duration tracking feature.

## Overview

The Point Timer feature allows users to record precise start times for each point. This enables the calculation of accurate point durations and displays relative timestamps (e.g., "+15s") for events within the game timeline.

## Usage

1.  **Enable**: Go to **Settings** and toggle **Point Timer** (requires "Track My Team Stats" to be enabled).
2.  **Start Point**: A "START" button appears in the center of the game screen when a new point begins. Tap it when the pull is released or the point starts.
3.  **View Timeline**: Turnovers and goals in the Game Timeline will automatically show accurate timing information.
4.  **Match Status**: View and toggle the timer on the **Match Status** (Game Info) screen, which features a vertical display with a large timer and pause/play control.

## Data Model

Timestamps are managed separately from the event log to ensure robust handling of undo/redo operations and game resets.

```typescript
// in store/gameStore.types.ts

export interface GameState {
  // ...
  // Finalized timestamps for completed points
  // Key: point number (1-based), Value: timestamp (ms)
  pointStartTimestamps: Record<number, number>;

  // Working timestamp for the currently active point
  // Set when START is tapped, cleared when point ends or is undone
  currentPointStartTime: number | null;
}
```

## Logic Flow

### Starting a Point

When the user taps "START":

- `currentPointStartTime` is set to `Date.now()`.
- The "START" button disappears.

### During a Point

- **Timeline Display**: In-progress points check `currentPointStartTime`. If set, relative times for turnovers are calculated immediately (e.g., `turnoverTime - currentPointStartTime`).

### Ending a Point

When a goal is scored (`incrementScore`):

1.  If `currentPointStartTime` is set, it is copied to `pointStartTimestamps[currentPoint]`.
2.  `currentPointStartTime` is reset to `null` for the next point.

### Undo Behavior

When a goal is undone (`undoLastAction`):

1.  The goal event is removed.
2.  `currentPointStartTime` is reset to `null`.
    - **Why?** This prevents a specific edge case: if a user finishes point 1, starts point 2 (setting `currentPointStartTime`), then realizes they made a mistake and undos the goal from point 1. We don't want the "point 2" start time to persist while they are fixing point 1.
3.  The **Historical Timestamp** (`pointStartTimestamps[1]`) remains intact.
4.  The "START" button logic checks for _both_ working and historical timestamps. If a historical timestamp exists for the current point, the button does not reappear, preventing duplicate start times.

## Timeline Integration

The `lib/timelineUtils.ts` module generates the `PointEvents` structure used by the timeline. It acts as the single source of truth for duration calculations:

1.  **Determine Start Time**: It looks for a finalized timestamp in `pointStartTimestamps`. If not found (e.g., in-progress point), it falls back to `currentPointStartTime`.
2.  **Calculate Duration**: `goalTimestamp - startTimestamp`.
3.  **Calculate Relative Times**: `eventTimestamp - startTimestamp`.

This prioritization ensures that even if events are edited or re-ordered, the point duration remains anchored to the definitive start time.
