# Shared Team And Roster Store

> **Status**: Done.

## Goal

Extract team and roster ownership into a shared store so both modes depend on the
same neutral source of truth.

The desired direction:

```
store/
  basic/              # Basic live game state only
  advancedTracking/   # Advanced live tracking and saved advanced games
  teamStore.ts        # Shared team list, current team, roster CRUD
```

Advanced tracking no longer reads team data from `store/basic`; its pre-game screen reads game
format defaults and the opponent name from `store/settingsStore.ts`.

## Basic Store State

Keep these in `store/basic`:

- scores, possession, current point, timeouts
- basic events and point lines
- basic saved games until the SQLite migration work happens
- basic-only game config and transient entry state

## Migration Sketch

1. Create `store/teamStore.ts` with persisted Zustand state.
2. Move shared team and roster actions from `store/basic/slices/teamSlice.ts`.
3. Update basic screens and flows to read/write team data through `teamStore`.
4. Update advanced tracking screens/hooks to use `teamStore` instead of
   `store/basic/gameStore`.
5. Keep compatibility during migration by hydrating `teamStore` from the old
   game-store snapshot if needed.
6. Remove team fields from the basic game-store persisted payload once migration
   is stable.

## Open Questions

- Should `savedTeams` remain AsyncStorage/Zustand-backed, or move toward the same
  future SQLite direction as saved games?
- Mid-game roster changes now flow one way into a live advanced game:
  additions/reactivations append participants, while deactivation and deletion are blocked after
  recorded actions.
