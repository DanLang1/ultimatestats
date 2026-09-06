# Android Native View Crashes

> Recorded Android Fabric crashes, structural fixes, and narrowly scoped timing workarounds.
> Timing workarounds are not the default navigation or persistence pattern.

## Confirmed Case

`app/(main)/LineEditor.tsx` previously triggered an Android native `addViewAt` crash when confirming
a line caused a route dismissal and a substantial live-store/render update in the same frame.

The current workaround:

1. Dismisses deterministically to `/Scoreboard`.
2. Defers the line-state update with `requestIdleCallback`.

Keep that ordering unless the crash is re-tested and shown to be resolved on supported Android
versions.

## Do Not Generalize It

Normal actions must update and persist their state before navigation invalidates it. In particular,
save/import/finalize flows must await persistence before dismissing, resetting, or clearing the
source state.

Use deferred mutation only for a reproduced native view-transition crash where:

- the state update does not need to finish before navigation,
- the route destination is explicit,
- delayed execution cannot save or mutate the wrong record, and
- the workaround is documented beside the callsite.

Do not add arbitrary delays or replace deterministic modal exits with `router.back()`.

## If the Crash Returns

Capture the route transition, affected Android/Expo/React Native versions, and the exact state
mutation. Prefer removing this workaround once the underlying transition is proven safe; otherwise
keep the exception local to the reproduced callsite.

## Advanced Injury Surface Swap

A reported Android Fabric `addViewAt` / child-already-has-parent crash occurs when Resume replaces
an injury in/out summary with the live player grid, and also on Confirm Sub before Resume.

`Tracker.tsx` keeps the tracking surface on a non-collapsible native parent so Fabric does not
flatten that swap. A `key={surfaceState.kind}` remount was tried and removed: Confirm writes the
injury stoppage while Tracker is still mounted, so that key also remounted live-point → stoppage in
the same turn as `TrackerInjurySub` dismissed.

`TrackerInjurySub.tsx` matches the Line Correction pattern by awaiting persistence
(`await persistCurrentLiveGame()`) before invoking `router.back()`. This ensures the injury record
is saved before dismissal and was also used to separate the updates in time. A persistence await
does not guarantee that native mounting has finished; retain it for the persistence contract,
not as proof that the native hierarchy is safe.

## Line Selection Grid: Structural Fix

After the line-selection redesign in `9ec3fef`, confirming also changes the grid wrapper's
`pointerEvents` from `auto` to `none` while the route may dismiss and the underlying Tracker may
replace its surface. Previously, the wrapper did not change `pointerEvents` during confirmation.
The redesign also changed grid grouping and chip wrappers.

In the installed React Native renderer, `pointerEvents="none"` makes a view form a stacking
context. A layout-only wrapper can otherwise be flattened, so this toggle can change native
parent/child structure during confirmation. That is a concrete candidate for the reported
`addViewAt` / child-already-has-parent failure, although the stack trace does not identify the
offending React component.

`components/advancedTracking/TrackerLineScreen.tsx` now sets `collapsable={false}` on the grid
wrapper that owns the `pointerEvents` toggle. This keeps that wrapper present in the native
hierarchy in both states. The user reported that this minimal change fixed the crash in an Android
retest. Exact device/build details and coverage of each injury/halftime path were not recorded.

Prefer preserving this structural fix over relying on delays: it removes the wrapper's flattening
transition rather than depending on scheduling. The successful retest supports this explanation
but does not establish that every earlier workaround is unnecessary. In particular, injury
confirmation still awaits persistence and Tracker retains its non-collapsible surface parent.

Jest cannot reproduce native Fabric mounting failures. Re-test injury Confirm/Resume and halftime
SET LINE / SAVE LINE on Android after changes to these native hierarchy boundaries.

## Halftime Line Save

Saving a halftime line (`TrackerLineSelect.tsx` in `prepare` mode) dismisses back to Tracker.
Pending line edits update the underlying Tracker while the selection route is mounted. The pending
selection does not change `currentGame`, so `persistLiveGame` dedupes by reference and does not
start a new SQLite write; awaiting it may only await an already-resolved promise.

A persistence await was tried and was insufficient; an additional animation-frame wait was then
tried as a timing workaround. The current code has removed those halftime waits and dismisses
directly, with the non-collapsible selection grid wrapper providing the structural fix described
above. The pre-pull confirm path (`router.push('/advancedTracking/PullTracking')`) is unchanged.
