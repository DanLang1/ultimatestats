# Future Feature: Event Editing in GameTimeline

## Overview

Allow users to edit game events (goals, turnovers, blocks) from the GameTimeline screen after a game is saved or during a live game.

## Status: Active Design (Revived Jan 2026)

Revisiting the feature with a simplified approach to avoid previous complexity pitfalls regarding game state cascading.

---

## 2026 Proposed Simplification

### 1. Interaction Model: Long Press

- **Action**: User **long presses** on any event row in the Game Timeline/Action Log.
- **Feedback**:
  - **Haptic Feedback**: Essential 'heavy' click feel to confirm selection.
  - **Visual**: Context menu or modal appears.

### 2. Live Game vs. Saved Game Scope

| Context        | Editable Scope                                                                                                |
| :------------- | :------------------------------------------------------------------------------------------------------------ |
| **Live Game**  | All _completed_ points can be edited. Current point should use Undo instead (more intuitive for quick fixes). |
| **Saved Game** | All points can be edited.                                                                                     |

### 3. Editing Scope

Users should be able to correct mistakes without needing to "undo" everything back to that point.

- **What can be edited?**
  - **Player Attribution**: Change who committed the turnover, who got the block, etc.
  - **Event Details**: Change "Throwaway" to "Drop".
  - _Example_: "Joe throwing it away" can be changed to "Kyle drops it".

### 4. Deletion Strategy (The "Safe" Approach)

- **Rule**: Users **CANNOT** delete the **Goal** or **Assist** events.
  - _Why?_ The Goal event defines the end of a point. Deleting it merges two points.
- **Rule**: Users **CAN** delete intermediate events (Turnovers, Blocks, etc.).
- **Confirmation**: Show a confirmation dialog before deletion:
  > "Delete this Throwaway by Kyle?"  
  > `[Cancel]` `[Delete]`
- **Philosophy**: "Trust the User". We allow possession inconsistencies rather than building a complex validator.

---

## Edge Cases & Notes

### Callahan Editing

If a Callahan is edited to add an assister (was `assistPlayerId: 'OTHER_TEAM'`, now a real player), the timeline should just display it as a normal Goal + Assist flow.

> **Testing Note**: This may "just work" without special handling. Verify during implementation.

---

## Implementation Plan

### UI Components

1.  **`EventTimeline.tsx`**:
    - Add `onLongPress` handler to event rows with haptic feedback.
    - **Live Game Guard**: Disable long-press for events in the _current_ (in-progress) point.

2.  **`EditEventModal.tsx`**:
    - **Edit View**: Dropdowns for Player and Event Type.
    - **Delete Action**: Only show if `!isGoal && !isAssist`. Show confirmation dialog.

### State Management (`gameStore.ts`)

1.  **`updateEvent(pointIndex, eventIndex, newDetails)`**

2.  **`deleteEvent(pointIndex, eventIndex)`** with goal/assist validation.

---

## Files to Modify

```
app/EditEventModal.tsx                 [NEW/MODIFY]
app/GameTimeline.tsx                   [MODIFY]
components/timeline/EventTimeline.tsx  [MODIFY]
store/gameStore.ts                     [MODIFY]
```
