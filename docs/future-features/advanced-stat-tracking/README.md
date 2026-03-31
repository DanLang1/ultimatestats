# Advanced Stat Tracking

> **Status**: Brainstorm / Future Feature

This folder captures planning for the advanced stat tracking feature.

Current direction:

- Treat advanced stat tracking as a new feature with its own data model.
- Do not extend or link to the current `SavedGame` + `GameEvent[]` model.
- Use separate persisted data and separate state ownership from the current game flow.
- Support both-team tracking and same-team scrimmages.
- Keep field location optional and flexible so rough zones or x/y coordinates can both fit later.
- Keep the stored model simple enough that new stat types can be added without reshaping the whole game format.

## Docs In This Folder

- [data-model.md](./data-model.md): Recommended persistence and domain model for the new feature.
- [field-stat-tracking.md](./field-stat-tracking.md): Older interaction and UI brainstorm. Useful for flow ideas, but outdated as the primary source for the data model.

## Recommendation Summary

The advanced tracker should be point-first, not one flat game-level event stream.

Each tracked game should:

- model two generic `sides` instead of hard-coded `team1` / `team2`
- separate `participants` from side assignment so scrimmages work cleanly
- store ordered `points`, each with ordered `possessions` and ordered `actions`
- use stable IDs for points, possessions, and actions
- derive goals, assists, completions, touches, and visualizations from those raw point/possession actions

If this feature is built, it should own its own store, persistence model, and save/load lifecycle rather than sharing ownership with the existing `savedGames` system.
