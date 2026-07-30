# Effect Checklist

Use this rubric for each `useEffect` callsite.

## Keep

Keep an effect when it synchronizes React with an external system:

- event subscription with cleanup;
- timer or interval with cleanup;
- native module, DOM, animation engine, or imperative widget;
- network or storage synchronization tied to component lifecycle;
- lifecycle-driven navigation that cannot be expressed declaratively.

Confirm that dependencies, cleanup, race handling, and stale closures are correct.

## Refactor

Refactor an effect when it:

- derives state from props, store state, or other React state;
- transforms data only for rendering;
- handles work caused by a specific user action;
- mirrors one state value into another;
- resets local state when a keyed subtree or render-time adjustment is clearer.

## Follow up

Use `follow-up` when:

- one effect mixes external synchronization with derivation or event handling;
- ownership should move to a store, route, or parent but the contract is unclear;
- removing the effect could change persistence, navigation, timing, or native behavior;
- current tests do not establish the lifecycle contract.

## Decision record

For each callsite record:

- `keep`, `refactor`, or `follow-up`;
- the external system or React-only responsibility;
- behavior that must be preserved;
- smallest safe rewrite or next validation step.
