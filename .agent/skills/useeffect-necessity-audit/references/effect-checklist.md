# Effect Checklist

Use this rubric for each `useEffect` callsite.

## Keep Effect

Keep the effect if it synchronizes React state with an external system:

- Network or storage sync
- Event subscriptions with cleanup
- Timers/intervals with cleanup
- Imperative API bridge (router, animation engine, native module, DOM)
- External widget lifecycle management

## Refactor Effect

Refactor if the effect is used for logic that should stay inside React render/event flow:

- Deriving state from props/store/state
- Transforming data for render
- Handling user interactions that could run directly in event handlers
- Resetting local state on prop change when keyed remount or render-time adjustment is clearer

## Smells

- Effect writes state immediately after every render to "keep values in sync"
- Effect chains state updates that could be a computed value
- Effect exists only to respond to a button press or direct user action
- Dependency suppression comments used to force one-time behavior without clear lifecycle reason

## Decision Format

For each effect, record:

- `keep` | `refactor` | `follow-up`
- One-line reason
- Smallest safe rewrite path (if `refactor`/`follow-up`)
