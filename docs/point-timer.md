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

1.  The goal event is removed from the event log.
2.  **Timer Resumes Running**: If the goal had `elapsedMs` stored, `currentPointStartTime` is set to `Date.now() - elapsedMs`. This makes the timer continue running from where it was when the goal was scored.
3.  **History Cleaned Up**: The entry in `pointStartTimestamps` for the undone point is deleted since that point is now in-progress again.
4.  **Pause State Cleared**: `pointTimerPausedElapsed` is set to `null`, so the timer is always running after undo.

**Example**: If you scored at 2:34 elapsed, then immediately undo, the timer will show ~2:34 and keep counting up. All turnover events recorded during that point retain their correct `elapsedMs` values.

## Timeline Integration

The `lib/timelineUtils.ts` module generates the `PointEvents` structure used by the timeline. It acts as the single source of truth for duration calculations:

1.  **Determine Start Time**: It looks for a finalized timestamp in `pointStartTimestamps`. If not found (e.g., in-progress point), it falls back to `currentPointStartTime`.
2.  **Calculate Duration**: `goalTimestamp - startTimestamp`.
3.  **Calculate Relative Times**: `eventTimestamp - startTimestamp`.

This prioritization ensures that even if events are edited or re-ordered, the point duration remains anchored to the definitive start time.
