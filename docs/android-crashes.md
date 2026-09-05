# Android Navigation Crash Exception

> Narrowly scoped note for the confirmed `LineEditor` workaround. This is not the default
> navigation or persistence pattern.

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
(`await persistCurrentLiveGame()`) before invoking `router.back()`. This separates the live-game
stoppage store update and Tracker surface swap from the route dismissal into separate turns/commits,
preventing concurrent native layout mutations on Android Fabric. Jest cannot reproduce native
Fabric mounting failures; re-test Confirm and Resume on Android after layout changes.
