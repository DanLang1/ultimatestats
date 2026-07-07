# Shared Team And Roster Store

> **Status**: Follow-up from basic/advanced structure split

## Problem

The app now has intentional basic and advanced namespaces for domain logic, stores,
hooks, and components. One ownership ambiguity remains: advanced tracking still
reads roster/team data from the basic game store.

Current known imports:

- `app/(main)/advancedTracking/PreGameConfirm.tsx`
- `components/advancedTracking/TrackerLineScreen.tsx`
- `hooks/advancedTracking/useLiveRosterParticipants.ts`

Those files use `useGameStore` for shared concepts like the active team roster,
not for basic scoring or basic game state. That means the dependency is practical
today, but the ownership is wrong: advanced should not need to import from
`store/basic`.

## Goal

Extract team and roster ownership into a shared store so both modes depend on the
same neutral source of truth.

The desired direction:

```
store/
  basic/              # Basic live game state only
  advancedTracking/   # Advanced live tracking and saved advanced games
  teamStore.ts        # Shared current team, saved teams, roster CRUD
```

After this, advanced tracking should have zero imports from `store/basic`.

## Likely Shared State

Move these concepts out of the basic game store:

- `currentTeam`
- `savedTeams`
- roster mutations such as `addPlayer`, `updateRosterPlayer`, and delete/toggle
  helpers
- team preset/import/save/delete actions

Keep these in `store/basic`:

- scores, possession, current point, timeouts
- basic events and point lines
- basic saved games until the SQLite migration work happens
- basic-only game config and transient entry state

## Migration Sketch

1. Create `store/teamStore.ts` with persisted Zustand state.
2. Move shared team and roster actions from `store/basic/gameStore.ts`.
3. Update basic screens and flows to read/write team data through `teamStore`.
4. Update advanced tracking screens/hooks to use `teamStore` instead of
   `store/basic/gameStore`.
5. Keep compatibility during migration by hydrating `teamStore` from the old
   game-store snapshot if needed.
6. Remove team fields from the basic game-store persisted payload once migration
   is stable.

## Open Questions

- Should `team2Name` remain basic game config, or become part of a broader
  opponent/game setup model?
- Should `savedTeams` remain AsyncStorage/Zustand-backed, or move toward the same
  future SQLite direction as saved games?
- Should roster editing be allowed while either mode has an active game, or
  should participation locks become mode-specific?

## Related Docs

- [Store Architecture Refactor](store-refactor.md)
- [Basic Games SQLite Migration](basic-games-sqlite-migration.md)
