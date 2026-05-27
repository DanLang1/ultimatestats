# Advanced Tracker Bugs

## Between-point timeout has no active timeout state

### Current behavior

When a timeout is taken after a point ends, the app records the timeout as a between-point
transition and decrements the available timeout count. The visible tracker UI does not otherwise
change, so it feels like the timeout button only marks a timeout as used.

During a live point, timeout behavior is different: the app creates an active stoppage, shows the
timeout countdown overlay, and requires an explicit resume or cancel action.

### Why it happens

There are currently two timeout paths:

- Live point timeout: `recordStoppage({ reason: 'timeout' })`
- After-point timeout: `recordBetweenPointTimeout(...)`

`recordBetweenPointTimeout(...)` appends a `timeout` entry to the finished point's
`transitionsAfter` array, but there is no active between-point timeout state for the tracker screen
to render.

The existing `BetweenPointTransition` type also does not store a timestamp, so a timeout countdown
cannot be started from the actual moment the timeout was called.

### Desired behavior

After a point ends:

1. Coach taps a timeout.
2. App records the timeout.
3. App shows a timeout countdown overlay.
4. Primary action should be `START NEXT POINT` or `SELECT LINE`, not `RESUME`.
5. Cancel should remove the just-recorded between-point timeout.
6. Starting the next point should clear the active between-point timeout state.

This should feel like a real timeout interval between points, not just a ledger entry.

### Possible implementation direction

- Add timing metadata to between-point timeout transitions, likely `startedAt`.
- Add a helper such as `getActiveBetweenPointTimeout(game)` that returns the latest timeout
  transition after the current ended point when the next point has not started yet.
- Teach `Tracker.tsx` to render a between-point timeout overlay when that helper returns a timeout.
- Reuse most of the existing `StoppageOverlay` countdown UI, but adjust actions for between-point
  flow:
  - primary: go to line select / start next point flow
  - secondary: cancel timeout transition
- Keep live point stoppages and between-point transitions separate in the data model. They represent
  different game states even though the UI can share visual treatment.
