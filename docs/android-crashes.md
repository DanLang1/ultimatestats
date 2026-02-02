# Android Navigation Crashes & "addViewAt" Errors

## The Issue

On Android, React Native can crash with errors like `addViewAt: failed to insert view` or "The specified child already has a parent" if a heavy state update triggers a re-render of a component _while_ that component is undergoing a navigation transition (unmounting or animating out).

This often happens when:

1.  A user action (e.g., "Confirm") triggers a global store update.
2.  The same action triggers a navigation event (`router.back()`, `router.dismiss()`).
3.  The component subscribes to the store, so the update forces a re-render during the exit animation.
4.  The ViewManager gets desynchronized, trying to move/add views that are being detached.

## The Solution: `requestIdleCallback`

To fix this, decouple the state update from the navigation event. The state update should be deferred until the Javascript thread is idle, which usually means after the navigation transition has started or completed.

Use `requestIdleCallback` to wrap the state update logic:

```typescript
const handleConfirm = () => {
  // Navigation happens immediately
  router.back();

  // State update is deferred
  requestIdleCallback(() => {
    heavyStoreUpdate(); // e.g., setCurrentLine(...)
  });
};
```

**Note:** If `requestIdleCallback` is not available (older environments), `setTimeout(() => { ... }, 0)` is a viable alternative.

> [!CAUTION]
> **Do NOT use `InteractionManager`**. It is deprecated in modern React Native and may be removed in future versions. Always prefer `requestIdleCallback` or `setTimeout`.

## Prevention Checklist

- [ ] Check if your component subscribes to the data you are updating.
- [ ] Check if you are navigating immediately after that update.
- [ ] If yes, wrap the update in `requestIdleCallback`.
