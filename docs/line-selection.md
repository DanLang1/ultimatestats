# Line Selection System

## Replace vs. Append (Correction vs. Substitution)

When a user edits a line mid-point, the system determines whether it's a **correction** (wrong preset picked) or a **real substitution** (injury/fatigue) by counting how many players changed:

| Players Changed | Behavior                    | Rationale                                      |
| --------------- | --------------------------- | ---------------------------------------------- |
| 1–2 players     | **Append** as substitution  | Small swap — likely a real sub                 |
| 3+ players      | **Replace** existing record | Most of the line changed — likely wrong preset |

When replacing, all existing `pointLines` records for that point are removed and a single corrected snapshot is written with `isSubstitution: false`. This ensures earlier mistaken lines don't count toward playing time.

Injury substitutions store explicit metadata on the appended `PointLineRecord`:
- `substitutionType: 'injury'`
- `subbedInPlayerIds` / `subbedOutPlayerIds`

Replacement/correction edits do not store substitution metadata. Legacy saved games without this metadata fall back to showing the union of all players who appeared during the point.

---

## Playing Time Attribution

Both `computePlayingTime()` (`lib/lineUtils.ts`) and `computePlayingTimeStats()` (`lib/playingTimeStatsUtils.ts`) use a `Set` to collect all players across every `PointLineRecord` for a given point. This means:

- A player subbed **out** mid-point still gets credit
- A player subbed **in** mid-point also gets credit
- If a line is **replaced** (correction), only the corrected players get credit — earlier records for that point were removed

The same point-participant set drives player pickers in timeline event editing. If line data is missing for a point, the editor falls back to the full roster.

---

## Undo and Point Lines

When a goal is undone (`undoLastAction`) or a pending goal is canceled from stat entry:

1. `currentPoint` is decremented back to the in-progress point
2. `pointLines` is filtered to `record.pointNumber <= currentPoint`
   - Lines for the current (reverted) point are **kept** — the line on field is still valid
   - Lines for future points are **removed**
3. `currentLine` is restored from the latest remaining record for the reverted point; cleared if none exists
4. `lineConfirmedForNextPoint` is cleared so the next point must be confirmed again

---

## Point Number Assignment in Events

All game events include an optional `pointNumber` field:

- **Goal events**: use `currentPoint - 1` (because `currentPoint` is incremented before the event is pushed)
- **Turnover / timeout events**: use `currentPoint` (they occur during the current point)
- **Legacy saved games**: may not have this field — stats utilities derive point numbers independently via `computePointByPointEvents()`

---

## Drag-to-Reorder Architecture

Preset reordering uses a **"commit during drag"** approach — items swap positions in the Zustand store in real-time as the user drags, rather than on drop. This avoids a visual flicker/pop caused by the timing gap between resetting shared values on the UI thread and React re-rendering new positions on the JS thread.

### How it works

1. **Gesture starts**: Records the item's initial index, sets `draggingId`
2. **During drag**: Calculates desired index from `dragOriginIndex + round(translationY / ROW_HEIGHT)`. When the desired index crosses a threshold, triggers a single-step swap via `scheduleOnRN(onSwap, from, to)` → `reorderPresets` in store
3. **Gesture ends**: Resets all shared values. All swaps already happened — no post-drop repositioning needed

### Key techniques

**Compensating translateY for layout changes** — when the dragged item swaps with neighbors, its flex layout position changes. To keep it visually under the user's finger:

```typescript
const layoutOffset = (dragCurrentIndex.value - dragOriginIndex.value) * ROW_HEIGHT;
transform: [{ translateY: dragTranslateY.value - layoutOffset }];
```

**Conditional LinearTransition** — `LinearTransition.duration(150)` is applied to all items *except* the one being dragged. Without this, `LinearTransition` fights the gesture-driven `translateY`:

```typescript
layout={isDraggingProp ? undefined : LinearTransition.duration(150)}
```

**Single-step swaps** — instead of jumping directly to the desired index (which skips items), swaps happen one step at a time so every intermediate item animates smoothly:

```typescript
const to = from + (clamped > from ? 1 : -1);
```
