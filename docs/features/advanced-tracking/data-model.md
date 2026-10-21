# Advanced Tracking Data Model

> Architecture rules for the persisted advanced-game model: what the code cannot show because it
> only shows what exists. Field shapes, the schema version, and per-result throw semantics live in
> `lib/advancedTracking/types.ts` (see `THROW_RESULT_SPECS`). Feature behavior lives in code and is
> pinned by tests; read those, not this document, for how a feature behaves.

## Model Rules

- The model is point-first and possession-first. Do not flatten advanced actions into the basic
  `GameEvent[]` model, dual-write advanced games into basic saved games, or persist derived stat
  counters.
- Scoring side, score progression, next receiving side, and completed-point state are derived from
  action order, never stored.
- Possession boundaries are explicit; derivations never reconstruct them from a game-wide stream.
- Capture adapters never write raw actions. They submit a semantic capture intent, and the live
  store appends canonical actions in one transaction.
- Game and point notes are private: never include them in sharing payloads or CSV exports.

## Sides, Participants, and Attribution

- A side is a game-specific competing group, not a team-one/team-two label, and is distinct from a
  saved team even when linked to one.
- Participants are game-scoped; each point's lines assign them to sides, so one participant can play
  for different scrimmage sides across a game. Attribute every action to the side and line at that
  action's historical point, never to a participant's current side or a later corrected line.
- `PlayerRef` keeps `participant` (known), `unknown` (should have been captured but was not), and
  `untracked` (intentionally anonymous side) apart. Never collapse them.
- Single-team, both-team, and scrimmage games share one schema. Branch through tracking-mode and
  side-perspective helpers, never parallel schemas.

## Editing and Undo

- Point, possession, action, transition, and participant IDs are stable. Corrections update payload
  fields; they never move actions between possessions or points.
- Corrections go through the shared domain operations in `lib/advancedTracking/` and their existing
  assertions; do not add another validation pattern.
- Undo history is local recovery state, outside the game schema, analytics, summaries, and every
  import, export, or sharing format.

## Changing the Persisted Model

1. Update the exported types and bump the schema version.
2. Add and test migration behavior in `lib/advancedTracking/migrations.ts` and the storage boundary.
3. Update sharing validation and serialization.
4. Update analytics compilation and downstream stat utilities.
5. Update seeded tests and Maestro fixtures, and this document only if a rule above changed.

Never reinterpret an existing field in place when old records would become ambiguous; absent
optional data means it was not captured. Derivations must distinguish missing timing data from zero
duration.
