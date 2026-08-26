# Analytics Layer

> Maintained reference for the implemented analytics layer. The exported types in
> `lib/advancedTracking/analyticsTypes.ts` and compiler in
> `lib/advancedTracking/buildAnalyticsGame.ts` are authoritative.

## Overview

The analytics layer sits between the raw data model and the stat util functions.

```
AdvancedTrackedGame          raw model — optimized for capture and editing
        ↓
  AnalyticsGame              analytics layer — one compiled pass, stat-friendly indexes
        ↓
  stat utils                 functions that derive and present stats to users
```

The raw model is optimized for logging and editing. The analytics layer is optimized for querying.
It is not a second persisted model — it is generated in-memory from the raw game on demand.

```ts
function buildAnalyticsGame(game: AdvancedTrackedGame): AnalyticsGame;
```

## Shape

```ts
type AnalyticsGame = {
  points: AnalyticsPoint[];
  possessions: AnalyticsPossession[];
  actions: AnalyticsAction[];
  attributions: AnalyticsAttribution[];
};
```

Four flat arrays. Each is a different lens on the same game:

- `points` — point-level context for flow UI, line stats, plus/minus
- `possessions` — possession-level context for hold/break/conversion rates
- `actions` — primary interface for most stat derivation
- `attributions` — pre-resolved stat attributions, makes weighted aggregation a one-liner

`possessions` prevents possession-level summaries such as conversion rate and scores after
turnovers from being reconstructed independently by each stat utility.

---

## Types

### `AnalyticsPoint`

```ts
// Relative to focusSideId.
// Completed points end with a goal. The last point may instead reflect the live
// in-progress game or a game terminated mid-point.
type PointState =
  | 'hold' // focus side received and scored
  | 'break' // focus side pulled and scored
  | 'broken' // focus side received, opponent scored
  | 'opp_hold' // focus side pulled, opponent scored
  | 'terminated' // game ended mid-point
  | 'in_progress'; // live point has not ended

type AnalyticsPoint = {
  id: string;
  pointIndex: number; // 0-based
  half: 1 | 2; // flips to 2 after the halftime transition

  // Perspective-neutral outcome fields — valid regardless of which side you query.
  // Use these with getPointStateForSide() to derive hold/break/etc. for any side
  // without recompiling the game.
  receivingSideId: string;
  pullingSideId: string;
  scoringSideId: string | null; // null for terminated or in-progress points

  // Convenience view from game.focusSideId's perspective.
  // For both-team tracking or scrimmages, use getPointStateForSide() instead.
  state: PointState;

  // Participants on the field for this point, by side.
  // Includes mid-point sub-in players — anyone who entered during the point is credited.
  linesBySide: Record<string, string[]>; // sideId → participantId[]

  // Each side's cumulative score at the START of this point (before this point's outcome).
  // Perspective-neutral — keyed by sideId. Useful for contextual stats like break rate
  // when trailing, comeback tracking, or momentum charts.
  scoresBySide: Record<string, number>; // sideId → score

  genderRatio?: 'more-women' | 'more-men';

  // Total point duration in ms, excluding paused time from stoppages.
  // Derived from last action's recordedAt - point.startedAt - total paused time.
  // Null if timestamps are absent.
  durationMs: number | null;

  // True when only one side possessed the disc for the entire point (no turnovers).
  // Only ever true for 'hold' or 'opp_hold' — breaks and broken points always involve
  // two possessions by definition, so isCleanHold is always false for those states.
  // Null when the point ended early due to game termination.
  isCleanHold: boolean | null;
};
```

### `AnalyticsPossession`

```ts
type AnalyticsPossession = {
  id: string;
  pointId: string;
  pointIndex: number;
  possessionIndex: number; // 0-based within the point

  sideId: string;
  result: 'scored' | 'turned_over' | 'terminated' | 'in_progress';
  turnoverType?: 'drop' | 'throwaway' | 'stall' | 'block' | 'pressure' | 'callahan';
};
```

Possession conversion denominators include every possession owned by the side, including the
current `in_progress` or `terminated` possession. A possession's `result` is `scored`,
`turned_over`, `in_progress`, or `terminated`; only `scored` counts as a successful conversion.
Every turnover result qualifies, including dropped pulls and opponent-caused blocks, pressures,
stalls, drops, and throwaways.

### `AnalyticsAction`

```ts
type AnalyticsAction = {
  id: string;
  kind: 'pull' | 'disc_pickup' | 'throw' | 'stoppage';

  pointId: string;
  pointIndex: number;
  possessionId: string;
  possessionIndex: number;
  actionIndex: number; // 0-based within the possession

  sideId: string;

  // Resolved from PlayerRef — null if unknown or untracked
  actorId: string | null; // thrower, puller, or picker-upper
  receiverId: string | null; // toPlayer on throws, receiver on pull
  defenderId: string | null;

  result?: string; // raw result value from PullAction or ThrowAction
  hangTimeMs?: number; // pull hang time in ms for pull actions
  details?: ThrowDetails; // optional manual throw metadata on throw actions

  // Within-possession backward link — derived during buildAnalyticsGame by
  // walking the possession's actions array in order. Not stored in the raw model.
  // Used for hockey assist: previousActionId points to the throw before the assist.
  previousActionId: string | null;

  splitAttribution: boolean;

  // Ms elapsed since the point started (action.recordedAt - point.startedAt),
  // with completed stoppage durations subtracted. Null if timestamps are absent.
  elapsedMs: number | null;
};
```

Throw details contain `type: 'huck' | 'backfield_reset'` and are valid on eligible raw throw
results. The compiler copies the object for timelines and exports but emits no additional
attributions, so existing turnover and plus/minus math is unchanged. Throw-type summaries derive
directly from compiled actions and are not persisted counters.

Timeline lineup displays use the analytics participation union for who appeared during the point,
then derive each player's final `IN` or `OUT` state from the raw point line plus ordered injury
substitutions. Points without substitutions show plain lineup chips; when the participation union
contains a player who finished out, the footer labels every participant's final state. Lineup
and touch corrections operate on that raw history; the analytics representation is never the
mutation source. Rebuilding analytics after a touch correction naturally moves completion, assist,
goal, turnover, and related derived attribution without storing parallel counters.

### `AnalyticsAttribution`

```ts
type AnalyticsAttribution = {
  type: AttributionType;
  participantId: string;
  weight: number; // 1.0 standard, 0.5 for split attribution
  actionId: string;
  pointId: string;
};

type AttributionType =
  | 'goal'
  | 'assist'
  | 'hockey_assist'
  | 'completion' // successful throw — used for completion %
  | 'throw_attempt' // an actual released throw; a stall is excluded
  | 'receiving_touch' // caught a throw (complete or goal) — does NOT include pull receptions
  | 'throwaway'
  | 'drop'
  | 'stall'
  | 'stall_conceded'
  | 'block'
  | 'pressure'
  | 'callahan'
  | 'pull'
  | 'pull_reception' // caught the pull — tracked separately from receiving_touch
  | 'disc_pickup'; // picked up a non-caught pull or turnover

// NOTE: receiving_touch and pull_reception are intentionally distinct.
// receiving_touch covers disc-movement touches within an offensive possession (catching completions/goals).
// pull_reception covers receiving the opening pull to start a possession.
// For a "total touches" metric, sum both: completion + receiving_touch + disc_pickup + pull_reception.
```

---

## Attribution Assignment Rules

These rules are applied once during `buildAnalyticsGame`. Stat utils never need to re-derive them.

| Raw action                 | Attributions emitted                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `throw` result `complete`  | `completion` + `throw_attempt` → actor; `receiving_touch` → receiver                                                                                                                           |
| `throw` result `goal`      | `goal` → receiver; `assist` → actor; `completion` + `throw_attempt` → actor; `receiving_touch` → receiver; `hockey_assist` → actor of previous `complete` throw in same possession (if exists) |
| `throw` result `drop`      | `throw_attempt` → actor; `drop` → receiver (weight 0.5 if `splitAttribution`); `throwaway` → actor (weight 0.5 if `splitAttribution`)                                                          |
| `throw` result `throwaway` | `throwaway` + `throw_attempt` → actor (always weight 1.0 — no receiver to share blame with, so `splitAttribution` is ignored)                                                                  |
| `throw` result `stall`     | `stall_conceded` → actor; `stall` → defender                                                                                                                                                   |
| `throw` result `block`     | `throwaway` + `throw_attempt` → actor; `block` → defender                                                                                                                                      |
| `throw` result `pressure`  | `throwaway` + `throw_attempt` → actor; `pressure` → defender                                                                                                                                   |
| `throw` result `callahan`  | `throwaway` + `throw_attempt` → actor; `callahan` + `block` + `goal` → defender (the Callahan scorer; no assister)                                                                             |
| `pull` result `inbound`    | `pull` → actor; `pull_reception` → receiver (an inbound pull)                                                                                                                                  |
| `pull` result `dropped`    | `pull` → actor; `drop` → receiver (puller is opposing team — no throwaway credit)                                                                                                              |
| `pull` result `ob`         | `pull` → actor                                                                                                                                                                                 |
| `disc_pickup`              | `disc_pickup` → actor                                                                                                                                                                          |

`hockey_assist` is the only credit that requires looking at a previous action. `previousActionId` on
`AnalyticsAction` makes this a simple lookup rather than a traversal.

---

## How Stats Map to the Analytics Layer

### Player stats

| Stat              | Derivation                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Goals             | `attributions` where `type === 'goal'`, sum `weight` by `participantId`                       |
| Assists           | `attributions` where `type === 'assist'`, sum `weight`                                        |
| Hockey assists    | `attributions` where `type === 'hockey_assist'`, sum `weight`                                 |
| Completions       | `attributions` where `type === 'completion'`, sum `weight`                                    |
| Completion %      | completions / throw attempts                                                                  |
| Throw attempts    | `attributions` where `type === 'throw_attempt'`, sum `weight`                                 |
| Receiving touches | `attributions` where `type === 'receiving_touch'`, sum `weight`                               |
| Total touches     | sum of `completion` + `receiving_touch` + `disc_pickup` + `pull_reception` attributions       |
| Throwaways        | `attributions` where `type === 'throwaway'`, sum `weight`                                     |
| Drops             | `attributions` where `type === 'drop'`, sum `weight`                                          |
| Stalls made       | `attributions` where `type === 'stall'`, sum `weight`                                         |
| Stalls conceded   | `attributions` where `type === 'stall_conceded'`, sum `weight`                                |
| Blocks            | `attributions` where `type === 'block'`, sum `weight`                                         |
| Pressures         | `attributions` where `type === 'pressure'`, sum `weight`                                      |
| Callahans         | `attributions` where `type === 'callahan'`, sum `weight`                                      |
| Points played     | `points` where `participantId` in `linesBySide[sideId]`, count                                |
| Plus/minus        | `goals + assists + blocks + stalls + (0.5 × pressures) - throwaways - drops - stallsConceded` |
| Playing time (ms) | sum of `durationMs` for points where participant is in `linesBySide`                          |
| Playing time %    | player playing time / total game time (sum of all point durations)                            |

### Team / possession stats

> `point.state` reflects `game.focusSideId`. For dual-perspective queries (both-team tracking,
> scrimmages) use `getPointStateForSide(point, sideId)` to derive state for any side.

| Stat                         | Derivation                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Holds                        | `points` where `state === 'hold'`, count                                            |
| Breaks                       | `points` where `state === 'break'`, count                                           |
| Times broken                 | `points` where `state === 'broken'`, count                                          |
| Hold rate                    | holds / completed O-points (holds + times broken)                                   |
| O-possession conversion      | scoring possessions on O-points / all possessions owned by side on O-points         |
| Break efficiency             | breaks / completed D-points where side gained at least one possession               |
| D-possession conversion      | scoring possessions on D-points / all possessions owned by side on D-points         |
| D-efficiency                 | breaks / completed D-points (breaks + opp holds)                                    |
| Overall conversion           | all scoring possessions / all possessions owned by side                             |
| Clean holds                  | `points` where `state === 'hold'` and `isCleanHold === true`                        |
| Dirty holds                  | `points` where `state === 'hold'` and `isCleanHold === false`                       |
| Possessions per point        | `possessions` grouped by `pointId`, average count                                   |
| Turnovers per point          | `possessions` where `result === 'turned_over'`, grouped by `pointId`, average count |
| Goals after turnovers        | `possessions` where `possessionIndex > 0` and `result === 'scored'`                 |
| Longest scoring run          | max consecutive `points` where focus side scored                                    |
| Longest drought              | max consecutive `points` where focus side did not score                             |
| Score at start of each point | `point.scoresBySide[sideId]`                                                        |
| Break rate when trailing     | `points` where focus is trailing per `scoresBySide` and `state === 'break'`         |
| Largest comeback             | max deficit in `scoresBySide` across points that focus side eventually won          |
| Avg point duration           | average of `durationMs` across completed points (exclude nulls)                     |
| Longest point                | max `durationMs`                                                                    |
| Shortest point               | min `durationMs` (exclude nulls)                                                    |

### Pull stats

| Stat           | Derivation                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| Pull outcomes  | `actions` where `kind === 'pull'`, group by `result`                        |
| Pull hang time | `actions` where `kind === 'pull'`, average `hangTimeMs` (exclude undefined) |

---

## Helpers

### `getPointStateForSide`

```ts
function getPointStateForSide(point: AnalyticsPoint, sideId: string): PointState;
```

Derives the point state from any side's perspective without recompiling the game.

Use this instead of `point.state` when you need hold/break rates for a side other than
`game.focusSideId` — for example, when displaying stats for both teams from a single
`AnalyticsGame`, or when analyzing a scrimmage where neither side is the canonical focus.

`terminated` and `in_progress` are perspective-neutral and return the same value for any `sideId`.

Perspective inversion pairs:

- `hold` ↔ `opp_hold` (focus received, scored ↔ focus pulled, opponent scored)
- `break` ↔ `broken` (focus pulled, scored ↔ focus received, opponent scored)

---

## What `buildAnalyticsGame` Does

One pass over the raw game in order:

1. Derive per-point context: `receivingSideId`, `scoringSideId`, `state`, `half`, `linesBySide`, `scoresBySide`, `durationMs`, `isCleanHold`
2. For each action: resolve `PlayerRef` → participant ID, attach point/possession indexes,
   carry action-specific fields like `hangTimeMs`, link `previousActionId` within the
   possession, compute `elapsedMs`
3. Emit attributions per action using the attribution assignment rules above
4. Return all four arrays

The builder fails fast if raw data would produce misleading analytics, including:

- unfinished historical points
- unfinished possessions except the final live possession of an in-progress or terminated game
- side ids or participant ids that do not match the game definition
- raw action side assignments that disagree with the enclosing possession

The builder does not mutate the raw game. It is a pure function.

Callahans remain represented by the thrower's raw `turned_over` possession. Team conversion
utilities add one synthetic D-possession and one successful conversion for the scoring
defense so the immediate defensive score has a 1/1 possession conversion result without changing
the persisted model.

---

## Boundaries

**What the analytics layer does:**

- Resolves `PlayerRef` values to participant IDs
- Attaches point and possession context to every action
- Emits pre-resolved stat attributions
- Derives point-level states (hold/break/broken/opp_hold/terminated/in-progress)

**What the analytics layer does not do:**

- Format stats for display
- Choose screen-level date, opponent, tournament, or half selections
- Persist anything (always generated in-memory on demand)
- Know about the UI or how stats will be presented

**What stat utils do:**

- Accept an `AnalyticsGame` (or a subset of its arrays)
- Return typed, unformatted stat values
- Apply domain filters explicitly requested by their function contract
