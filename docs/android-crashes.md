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
