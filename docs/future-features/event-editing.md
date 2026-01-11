# Future Feature: Event Editing in GameTimeline

## Overview

Allow users to edit game events (goals, turnovers) from the GameTimeline screen after a game is saved.

## Status: Archived

Archived on 2026-01-11 due to complexity around event deletion (deleting a goal orphans turnovers, shifts point numbers, and breaks hold/break logic).

---

## Implementation Progress (Partially Complete)

### Completed Work

#### Store Layer

- **`gameStore.types.ts`**: Added `updateSavedGameEvent` and `deleteSavedGameEvent` action signatures
- **`gameStore.ts`**: Implemented both actions with automatic score recalculation

#### Timeline Utilities

- **`timelineUtils.ts`**: Added `eventIndex` to `DisplayTurnover` and `goalEventIndex` to `PointEvents` for mapping displayed items back to raw events array

#### UI Components

- **`EditEventModal.tsx`**: New modal for editing/deleting events with:
  - Player selection for goal scorer/assister
  - Turnover type picker
  - Delete button
- **`EventTimeline.tsx`**: Added `onEditEvent` prop, wrapped event rows in `Pressable`
- **`GameTimeline.tsx`**: Added handler to navigate to EditEventModal for saved games
- **`_layout.tsx`**: Registered EditEventModal route

---

## Open Issues to Resolve

### 1. Event Deletion Side Effects

Deleting a goal causes:

- Point numbers to shift (point 6 becomes point 5)
- Orphaned turnovers get absorbed into next point
- Hold/break logic becomes incorrect

**Potential solutions:**

- Cascade delete turnovers since previous goal
- Show confirmation warning about orphaned turnovers
- Disallow deleting goals, only allow editing player attribution

### 2. UX Decisions Needed

- Should editing be available during live games too?
- Should there be an "undo to this point" feature instead?

---

## Files Changed (to be reverted)

```
app/EditEventModal.tsx         [NEW - DELETE]
app/_layout.tsx                [MODIFIED]
app/GameTimeline.tsx           [MODIFIED]
components/timeline/EventTimeline.tsx  [MODIFIED]
lib/timelineUtils.ts           [MODIFIED]
lib/__tests__/timelineUtils.test.ts    [MODIFIED]
store/gameStore.ts             [MODIFIED]
store/gameStore.types.ts       [MODIFIED]
```

## Revert Command

```bash
git checkout -- .
```
