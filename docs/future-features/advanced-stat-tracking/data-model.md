# Advanced Stat Tracking Data Model

> **Status**: Brainstorm / Future Feature

This document proposes a cleaner v1 data model for advanced stat tracking.

The main goal is to keep the raw stored model stable and simple enough that:

- current stats are easy to derive
- pass chains are first-class
- game flow is preserved
- tracking both sides fits naturally
- same-team scrimmages fit naturally
- future visualizations do not require a schema rewrite

## Summary

The recommended v1 shape is:

- one `AdvancedTrackedGame`
- made of ordered `points`
- each point contains ordered `possessions`
- each possession contains ordered `actions`

In short:

```ts
AdvancedTrackedGame -> points[] -> possessions[] -> actions[]
```

This is more structured than one flat game-wide event stream, but still simple enough to edit, persist, and derive stats from.

For advanced stats, that derivation should happen in two steps:

1. Raw persisted model -> compiled stat-friendly representation
2. Compiled representation -> player, team, possession, and visualization outputs

## Why A New Model

The current `SavedGame` model is good for lightweight stat entry, but it is not the right base for advanced tracking.

Current limitations:

- `SavedGame` is centered on one tracked roster plus a lightweight opponent
- `GameEvent` only captures goals, turnovers, and timeouts
- point context is split across separate structures like `events`, `pointLines`, and `pointStartTimestamps`
- pass chains, pulls, and possession flow are not first-class
- both-side tracking and scrimmages do not fit the model naturally

Because of that, advanced stat tracking should be its own persisted model and store.

## Design Goals

- Keep the persisted shape explicit and durable.
- Make each point self-contained.
- Make each possession self-contained.
- Avoid `team1` / `team2` assumptions in raw storage.
- Support both single-team and both-team tracking.
- Support scrimmages without special-case schema branching.
- Keep player stats derived, not stored as counters.
- Support rough or precise field location without locking into one UI.
- Make editing safe with stable IDs.

## Core Recommendation

Use this top-level model:

```ts
interface AdvancedTrackedGame {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;

  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  status: 'in_progress' | 'final' | 'terminated';
  // Only set when status is 'terminated'. Score limit is not an end reason — that is just status: 'final'.
  endReason?: 'time_limit' | 'weather' | 'conceded' | 'manual';

  focusSideId: string;
  metadata?: GameMetadata;
  settings: AdvancedTrackingSettings;

  // Only set when locationMode is 'zone' or 'xy'. Sides flip after the halftime
  // GameTransition. Scrimmages are not supported yet — revisit when needed.
  initialAttackingEndzoneBySide?: Record<string, Endzone>;

  // Which side received the pull to start the game (coin flip result).
  // Per-point offense is derived: the side that did not score receives next,
  // with roles flipping after the halftime GameTransition.
  initialReceivingSideId: string;

  sides: GameSide[];
  participants: Participant[];
  gameTransitions?: GameTransition[];
  points: TrackedPoint[];
}
```

This model should be the source of truth for the advanced feature.

## Recommended Types

```ts
interface GameMetadata {
  title?: string;
  opponentName?: string;
  location?: string;
  date?: string; // ISO date string: YYYY-MM-DD
  notes?: string;
}

interface AdvancedTrackingSettings {
  locationMode: 'none' | 'zone' | 'xy';
  format?: GameFormatSettings;
}

interface GameFormatSettings {
  formatType: 'standard';
  gameTo?: number;
  halftimeAt?: number;
  softCapAt?: number;
  hardCapAt?: number;
}

interface GameSide {
  id: string;
  label: string; // "Home", "Away", "White", "Dark"
  colorToken?: string;
  sourceTeamId?: string | null;
  trackingMode: 'full-roster' | 'anonymous';
}

interface Participant {
  id: string;
  name: string;
  sourcePlayerId?: string | null;
  // Mirrors matchingType from basic tracking Player. 'fmp' = female matching, 'mmp' = male matching.
  // Required for gender ratio validation in mixed games.
  matchingType?: 'fmp' | 'mmp' | null;
  // Mirrors role from basic tracking Player. Used for line selection UI and role-based stat breakdowns.
  role?: 'handler' | 'cutter' | 'hybrid' | null;
}

interface PointSub {
  id: string;
  sideId: string;
  type: 'injury';
  inIds: string[];
  outIds: string[];
  stoppageActionId: string;
}

interface TrackedPoint {
  id: string;
  lines: PointLine[];
  subs?: PointSub[];
  possessions: PointPossession[];
  transitionsAfter?: BetweenPointTransition[];
  // Gender ratio for this point in mixed games. 'more-women' = FMP, 'more-men' = MMP.
  genderRatio?: 'more-women' | 'more-men';
}

interface PointLine {
  sideId: string;
  participantIds: string[];
}

interface PointPossession {
  id: string;
  sideId: string;
  actions: PossessionAction[];
}

type BetweenPointTransition =
  | {
      id: string;
      transitionType: 'timeout';
      sideId: string; // required — always know which side called it
    }
  | {
      id: string;
      transitionType: 'spirit_timeout' | 'administrative' | 'heat_timeout';
      sideId?: string;
    };

type GameTransition =
  | {
      id: string;
      transitionType: 'halftime';
      // Derived from score progression: for a game to 15, halftime is after the first point
      // where either side reaches 8. Undoing that scoring point removes or repositions halftime.
      afterPointId: string;
    }
  | {
      id: string;
      transitionType: 'soft_cap';
      // Timer-driven event. Once recorded, it changes the effective gameTo target.
      afterPointId: string; // soft cap always activates between points
    }
  | {
      id: string;
      transitionType: 'hard_cap';
      // Timer-driven event. Once recorded, it is append-only.
      afterPointId?: string; // may be absent if cap ends the game mid-point
    };

type Endzone = 'near' | 'far';

type PlayerRef =
  | { refType: 'participant'; participantId: string }
  | { refType: 'unknown' }
  | { refType: 'untracked' };

type FieldLocation =
  | { locationType: 'zone'; zoneId: string }
  | { locationType: 'xy'; x: number; y: number };

type PossessionAction = PullAction | DiscPickupAction | ThrowAction | StoppageAction;

interface PullAction {
  id: string;
  kind: 'pull';
  sideId: string;
  receivingSideId: string;
  puller: PlayerRef;
  receiver?: PlayerRef;
  // 'ob': flew OB or brick invoked — receiving team spots the disc and picks up.
  // 'dropped': receiver touched it and dropped — possession flips to pulling team via turnover_pickup.
  result: 'inbound' | 'ob' | 'dropped';
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
}

interface DiscPickupAction {
  id: string;
  kind: 'disc_pickup';
  sideId: string;
  player: PlayerRef;
  location?: FieldLocation;
}

interface ThrowAction {
  id: string;
  kind: 'throw';
  sideId: string;
  thrower: PlayerRef;
  toPlayer?: PlayerRef;
  // 'stall': count reached 10, no throw — disc turns over at the spot. Attributed to thrower, no toPlayer.
  result: 'complete' | 'goal' | 'drop' | 'throwaway' | 'stall' | 'block' | 'pressure' | 'callahan';
  defender?: PlayerRef;
  /** True when blame is shared 50/50 between thrower and toPlayer. Single attribution is derived from result + thrower/toPlayer. */
  splitAttribution?: boolean;
  origin?: FieldLocation;
  target?: FieldLocation;
}

interface StoppageAction {
  id: string;
  kind: 'stoppage';
  reason: 'timeout' | 'injury';
  sideId?: string;
}
```

## Why This Shape

### Point-first and possession-first

Ultimate is naturally point-based, but advanced stats are often possession-based.

That is why the recommended model is:

- point-first at the game level
- possession-first inside each point

This makes the raw model much easier to reason about than:

- one flat game-wide stream
- or one point-level action list with possession changes only implied

Making possessions explicit simplifies derived stats like:

- O-line conversion rate
- D-line break rate
- break efficiency
- time of possession
- possessions per point
- scoring after a block or throwaway
- team flow visualizations

### Why not a single flat action stream

A flat stream is attractive during logging, but it pushes complexity into every downstream consumer.

With a flat stream, visualizations and calculations usually have to reconstruct:

- which point an action belongs to
- which possession an action belongs to
- when possession changed
- how the point ended

That is exactly the kind of hidden complexity we want to avoid this time.

### Why not store derived counters

The model should store the sequence of observed play, not precomputed totals.

Goals, assists, completions, plus/minus, throwaways, drops, blocks, points played, holds, and breaks should all be derived.

That keeps the raw model stable even as stats evolve.

### Why add a compiled derivation layer

The raw model is optimized for logging, editing, replay, and persistence.

That is the right source of truth, but it is not the best direct input for every stat calculation.

Some derived stats need more semantic context than the raw action objects expose directly. Examples:

- hockey assists need to know the previous relevant throw in the same possession
- touch stats need a consistent interpretation of when possession of the disc changed hands
- turnover stats need a normalized view of who was charged for the turnover
- connection stats need a consistent thrower-receiver pairing model where receiver data was actually captured

If every stat utility has to rediscover those relationships from nested point, possession, and action arrays, derivation code will become increasingly complex and repetitive.

Instead, keep the stored schema simple and introduce a compiled analytics layer in memory.

That compiled layer should:

- resolve `PlayerRef` values into participant IDs when available
- annotate each action with point and possession context
- expose previous and next throw relationships within a possession
- normalize stat credit for goals, assists, blocks, turnovers, and touches
- preserve links back to raw point, possession, and action IDs for debugging and editing flows

This keeps the persistence model stable while making advanced stat derivation easier to extend.

In other words:

- raw model = best for capture and editing
- compiled model = best for analytics and derived stats

For readability, `kind` is reserved for the main action union (`pull`, `disc_gain`, `throw`, `stoppage`).
Nested helper objects use more specific discriminator names like `refType`, `transitionType`, and `locationType`.

## Editing And Undo

The advanced tracker should support correcting logged data without turning v1 into a full history-rewriting editor.

The recommended v1 rule is:

- allow edits to event payloads
- do not allow edits that change the surrounding point or possession structure

In practice, that means these edits should be supported:

- change `PlayerRef` attribution on an existing action
- change a `ThrowAction.result` or `splitAttribution`
- change a `toPlayer`, `defender`, or field location on an existing action
- change timeout or stoppage details on an existing `StoppageAction`, `BetweenPointTransition`, or a derived/manual `GameTransition` when that event is intended to be user-correctable
- delete or undo the most recent logged item when the user immediately catches a mistake

These edits should not be supported in v1:

- moving an action to a different possession
- reordering historical actions
- splitting or merging possessions after the fact
- changing which possession scored and rebuilding the rest of the point
- editing an old action in a way that implicitly rewrites downstream point flow

This keeps the model aligned with the most likely coaching workflow:

- "Joe, not Joel"
- "that was a drop, not a throwaway"
- "wrong defender"
- "timeout was the other side"

### Stable editing boundary

For v1, IDs and containment should be treated as stable:

- a `TrackedPoint` keeps the same `id`
- a `PointPossession` keeps the same `id`
- a `PossessionAction` keeps the same `id`
- a `BetweenPointTransition` keeps the same `id`
- a `GameTransition` keeps the same `id`

Editing may change payload fields on an existing object, but it should not move that object into a different point or possession.

### Undo

Undo is still important, but it does not need to mean arbitrary historical rewrite.

For v1, undo should be scoped to recent user operations:

- expose one store-level undo entry point
- undo the most recent undoable stat operation, regardless of whether it was an action or a between-point timeout
- allow the scoring action that caused a derived halftime transition to be undone normally, with halftime re-derived from the updated score progression

That is much closer to the existing app behavior, where undo is mainly a quick recovery tool for recent mistakes rather than a full "edit old history and replay the game" system.

Clock and injury-flow operations are corrected from their own UI instead of the generic stat undo stack. Active stoppages can be cancelled before resuming; injury subs can be edited from the injury-sub flow. Cap events are also an exception: `soft_cap` and `hard_cap` are timer-driven rule changes, not coach-entered game edits, so they should be append-only rather than undoable.

The recommended implementation approach is:

- keep the nested `points -> possessions -> actions` model as the canonical persisted data
- keep `transitionsAfter` as canonical between-point team-controlled data
- keep `gameTransitions` as canonical format-driven game-flow data
- implement undo/redo in the advanced tracking store as recent editor operations, not as part of the persisted schema
- keep one operation stack rather than separate undo systems for actions vs transitions

In other words:

- persisted model = corrected source of truth
- store-level undo stack = temporary editing convenience

This lets the feature support common corrections without adding the complexity of a second event-sourcing layer or a full historical replay engine.

## Semantics

### `initialReceivingSideId`

Which side received the pull to start the game, set from the coin flip at game creation.

Per-point offense is derived from this:

- the side that did not score receives the next point
- roles flip after the `halftime` `GameTransition`

### `initialAttackingEndzoneBySide`

Only relevant when `locationMode` is `'zone'` or `'xy'`. Records which endzone each side attacks at the start of the game.

Per-point endzone assignment is derived: sides flip after the `halftime` `GameTransition`. This works cleanly for standard games.

Scrimmages are still supported in v1. The main caveat is that nonstandard side-switch behavior in scrimmages may eventually need additional format rules beyond a simple halftime flip.

### `lines`

Participants exist for the game. `lines` assign participants to a side for a specific point.

This is important for scrimmages because the same participant may be on different sides in different points.

`defaultSideId` is intentionally not part of `Participant`. Side membership should come from point lineup context, not be baked into the participant record.

### `PlayerRef`

`PlayerRef` distinguishes three very different cases:

- `refType: 'participant'`: known tracked player
- `refType: 'unknown'`: player identity matters for this side, but was not captured for this action
- `refType: 'untracked'`: this side is intentionally anonymous

That distinction is especially important in single-team tracking where the opponent side is usually anonymous.

### `disc_pickup`

`disc_pickup` records who has the disc at the start of a possession when the pull was not caught.

Use it when a side establishes possession by:

- picking up a grounded pull
- picking up after a turnover
- re-establishing play after a dead-disc check

The reason (pull pickup vs turnover pickup vs dead disc check) is always derivable from context and does not need to be stored. The coach just records who has the disc.

### `throw`

`throw` is the main pass action.

It supports:

- regular completions
- regular goals
- drops
- throwaways
- stall outs
- blocks
- pressures
- Callahans

`toPlayer` is optional. Present on `complete` and `goal` (the receiver), and optionally on `drop`. Absent on `throwaway`, `stall`, `block`, `pressure`, and `callahan` — coaches record what happened, not intent.

- for `complete` and `goal`, `toPlayer` is the player who caught the disc
- for `drop`, `toPlayer` is optionally the player who dropped it
- for `stall`, the `thrower` is the player who was holding the disc when the count reached 10
- for `throwaway`, `stall`, `block`, `pressure`, and `callahan`, omit `toPlayer` — no receiver to record

A "block" covers both cases where the D knocks the disc to the ground and where the D catches it cleanly (what some folks call an interception). Both resolve to the same stat credits — the next possession's side and starter already tell you whether the D retained the disc.

A "pressure" is a turnover directly caused by a tracked defender without awarding a block or stall. It stores that player in `defender`, emits one pressure attribution, and is worth half a block in plus/minus.

### `splitAttribution`

Single attribution is derivable — a throwaway blames the thrower, a drop blames the receiver (`toPlayer`). Only split (50/50) is a coach judgment call that can't be derived, so `splitAttribution: true` is the only thing worth storing explicitly.

### Point End State

Points do not store a separate persisted `outcome` field in v1.

That is intentional:

- during normal play, a point is expected to resume after stoppages rather than remain in a saved "unfinished" state
- if the game ends early, the game itself is ended rather than preserving a special per-point unfinished outcome
- scoring side and scoring possession are derived from the final scoring action in the point

The adapter can still expose compiled point outcome information for stats and UI, but the raw stored model stays simpler.

### `genderRatio`

For mixed games, store the ratio on each `TrackedPoint`:

- `'more-women'` = FMP majority (e.g. 4F/3M)
- `'more-men'` = MMP majority (e.g. 3F/4M)

This mirrors `GenderRatio` from `genderRatioUtils`. Omit for non-mixed games.

`Participant.matchingType` (`'fmp'` / `'mmp'`) mirrors the existing `Player.matchingType` from basic tracking and is the source of truth for which players count toward each ratio.

### `transitionsAfter`

Use `transitionsAfter` for between-point team-controlled events:

- between-point timeout
- administrative pauses

Do not model these as in-point possession actions.

### `gameTransitions`

Use `gameTransitions` for derived or timer-driven game-flow changes:

- halftime
- soft cap activation
- hard cap reached

These are not possession actions and are not team-called between-point events.

For v1:

- halftime is derived from score progression and stored so analytics and point-flow logic can reference a stable `afterPointId`
- soft cap and hard cap are timer events that affect game-over logic and effective `gameTo`

## Supported Tracking Modes

### Single-team tracking

This should be the default usage:

- one side has `trackingMode: 'full-roster'`
- the opponent side has `trackingMode: 'anonymous'`

This still allows full team-flow tracking while limiting opponent player detail.

### Both-team tracking

Both sides use `trackingMode: 'full-roster'`.

This enables:

- player-to-player pass maps on both sides
- full blocks / drops / throwaways for both sides
- both-side plus/minus
- both-side lineup and point results

### Scrimmage

Scrimmage should not require a different schema.

Use:

- `gameType: 'scrimmage'`
- two sides like `White` and `Dark`
- participants shared at the game level
- point `lines` to assign participants per side, per point

That gives a clean model for inter-team scrimmages and same-roster split scrimmages.

## Derived Stats This Model Should Support

These outputs should be derived from the compiled analytics layer, not by having each consumer manually traverse raw nested actions and reimplement stat semantics.

### Current stats parity

This v1 model should cleanly support all current stat categories:

- goals
- assists
- blocks
- throwaways
- drops
- fifty-fifty turnovers
- callahans
- plus/minus
- points played

### Advanced player stats

- completions
- completion percentage
- receiving touches
- total touches
- hockey assists
- thrower-receiver connection stats
- goals per point
- assists per point
- turnovers per point

### Team and possession stats

- holds
- breaks
- times broken
- clean holds
- dirty holds
- O-points
- D-points
- O-efficiency
- D-efficiency
- break efficiency
- possessions per point
- scores after turnovers
- pull outcomes
- pull hang time

### Visualization-friendly outputs

- pass maps
- touch maps
- progression charts
- heat maps
- red zone stats
- point flow timelines

## Scenario Walkthroughs

These scenarios are intentionally small and partial. The point is to make the shape easy to visualize, not to show every optional field.

### Scenario 1: Single-team game, clean offensive hold

Team setup:

- `Sharks` is the focus side and uses `full-roster`
- `Rivals` is anonymous
- Sharks receive the pull

```ts
const game: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: 'sharks',
  settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 } },
  sides: [
    { id: 'sharks', label: 'Sharks', trackingMode: 'full-roster', sourceTeamId: 'team_sharks' },
    { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'p_alex', name: 'Alex' },
    { id: 'p_blair', name: 'Blair' },
    { id: 'p_casey', name: 'Casey' },
  ],
  points: [
    {
      id: 'pt1',
      lines: [{ sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
      possessions: [
        {
          id: 'pos1',
          sideId: 'sharks',
          actions: [
            {
              id: 'a1',
              kind: 'pull',
              sideId: 'rivals',
              receivingSideId: 'sharks',
              puller: { refType: 'untracked' },
              receiver: { refType: 'participant', participantId: 'p_alex' },
              result: 'inbound',
            },
            {
              id: 'a2',
              kind: 'throw',
              sideId: 'sharks',
              thrower: { refType: 'participant', participantId: 'p_alex' },
              toPlayer: { refType: 'participant', participantId: 'p_blair' },
              result: 'complete',
            },
            {
              id: 'a3',
              kind: 'throw',
              sideId: 'sharks',
              thrower: { refType: 'participant', participantId: 'p_blair' },
              toPlayer: { refType: 'participant', participantId: 'p_casey' },
              result: 'goal',
            },
          ],
        },
      ],
    },
  ],
};
```

What this gives us immediately:

- Alex: 1 pull reception touch, 1 completion
- Blair: 1 completion, 1 assist
- Casey: 1 goal
- Sharks: 1 offensive point, 1 hold

### Scenario 2: Single-team game, opponent pull lands, offense picks up, then throwaway and break

This shows:

- pull not caught
- possession started by `disc_gain`
- turnover chain
- anonymous opponent scoring

```ts
const point2: TrackedPoint = {
  id: 'pt2',
  lines: [{ sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
  possessions: [
    {
      id: 'pos2a',
      sideId: 'sharks',
      actions: [
        {
          id: 'b1',
          kind: 'pull',
          sideId: 'rivals',
          receivingSideId: 'sharks',
          puller: { refType: 'untracked' },
          result: 'inbound',
        },
        {
          id: 'b2',
          kind: 'disc_pickup',
          sideId: 'sharks',
          player: { refType: 'participant', participantId: 'p_alex' },
        },
        {
          id: 'b3',
          kind: 'throw',
          sideId: 'sharks',
          thrower: { refType: 'participant', participantId: 'p_alex' },
          result: 'throwaway',
        },
      ],
    },
    {
      id: 'pos2b',
      sideId: 'rivals',
      actions: [
        {
          id: 'b4',
          kind: 'disc_pickup',
          sideId: 'rivals',
          player: { refType: 'untracked' },
        },
        {
          id: 'b5',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'untracked' },
          toPlayer: { refType: 'untracked' },
          result: 'goal',
        },
      ],
    },
  ],
};
```

What this gives us:

- Sharks had an O-point and got broken
- Alex gets a throwaway
- Rivals get a break
- no opponent player identity was required

Possible richer version of the same throwaway, if the target is known:

```ts
{
  id: 'b3',
  kind: 'throw',
  sideId: 'sharks',
  thrower: { refType: 'participant', participantId: 'p_alex' },
  toPlayer: { refType: 'participant', participantId: 'p_blair' },
  result: 'throwaway',
}
```

That means "Alex threw it away while trying to hit Blair," not "Blair caught it."

### Scenario 3: Both-team tracking, block and short-field conversion

This shows:

- both sides use real participants
- a block is represented as a failed throw with defender info
- next possession starts from that turnover

```ts
const point3: TrackedPoint = {
  id: 'pt3',
  lines: [
    { sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] },
    { sideId: 'rivals', participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
  ],
  possessions: [
    {
      id: 'pos3a',
      sideId: 'rivals',
      actions: [
        {
          id: 'c1',
          kind: 'pull',
          sideId: 'sharks',
          receivingSideId: 'rivals',
          puller: { refType: 'participant', participantId: 'p_alex' },
          receiver: { refType: 'participant', participantId: 'p_ryan' },
          result: 'inbound',
        },
        {
          id: 'c2',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'participant', participantId: 'p_ryan' },
          toPlayer: { refType: 'participant', participantId: 'p_sam' },
          result: 'block',
          defender: { refType: 'participant', participantId: 'p_blair' },
        },
      ],
    },
    {
      id: 'pos3b',
      sideId: 'sharks',
      actions: [
        {
          id: 'c3',
          kind: 'disc_pickup',
          sideId: 'sharks',
          player: { refType: 'participant', participantId: 'p_blair' },
        },
        {
          id: 'c4',
          kind: 'throw',
          sideId: 'sharks',
          thrower: { refType: 'participant', participantId: 'p_blair' },
          toPlayer: { refType: 'participant', participantId: 'p_casey' },
          result: 'goal',
        },
      ],
    },
  ],
};
```

What this gives us:

- Blair gets a block and an assist
- Casey gets a goal
- Sharks get a D-point break
- Rivals get a turnover charged to Ryan

### Scenario 4: Fifty-fifty turnover

This is the direct replacement for the current basic `fiftyfifty` stat.

```ts
const throwAction: ThrowAction = {
  id: 'd1',
  kind: 'throw',
  sideId: 'sharks',
  thrower: { refType: 'participant', participantId: 'p_alex' },
  toPlayer: { refType: 'participant', participantId: 'p_blair' },
  result: 'drop',
  splitAttribution: true,
};
```

Derived result:

- Alex gets 0.5 throwaway
- Blair gets 0.5 drop

If later we decide the UI should capture this as a dedicated outcome instead of a `drop` with split credit, the derivation layer can stay the same.

### Scenario 5: Same-team scrimmage

This shows why `participants` and `lines` must stay separate.

```ts
const scrimmageGame: AdvancedTrackedGame = {
  id: 'scrim1',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  gameType: 'scrimmage',
  status: 'in_progress',
  focusSideId: 'white',
  settings: { locationMode: 'zone' },
  sides: [
    { id: 'white', label: 'White', trackingMode: 'full-roster', sourceTeamId: 'team_sharks' },
    { id: 'dark', label: 'Dark', trackingMode: 'full-roster', sourceTeamId: 'team_sharks' },
  ],
  participants: [
    { id: 'p_alex', name: 'Alex', sourcePlayerId: 'alex' },
    { id: 'p_blair', name: 'Blair', sourcePlayerId: 'blair' },
    { id: 'p_casey', name: 'Casey', sourcePlayerId: 'casey' },
    { id: 'p_drew', name: 'Drew', sourcePlayerId: 'drew' },
  ],
  points: [
    {
      id: 'sp1',
      lines: [
        { sideId: 'white', participantIds: ['p_alex', 'p_blair'] },
        { sideId: 'dark', participantIds: ['p_casey', 'p_drew'] },
      ],
      possessions: [],
    },
  ],
};
```

On the next point, Alex could appear on `dark` instead of `white` without changing the participant record at all.

That is exactly why side assignment belongs in point lines, not in the player itself.

## Comparison To Other Approaches

### Versus extending current `SavedGame`

Not recommended.

Problems:

- too tied to one tracked roster
- too coarse for pass-by-pass flow
- point context remains split across multiple structures
- awkward fit for both-side stats and scrimmages

### Versus a flat advanced action stream

Better than current basic events, but still not ideal.

Problems:

- every consumer must rebuild points and possessions
- editing is harder
- visualization code becomes more fragile

### Versus point-only `actions[]` with implicit possessions

Viable, but weaker than explicit possessions.

Problems:

- possessions still have to be reconstructed
- O/D and conversion stats become more error-prone
- turnover chains are harder to inspect and edit

### Recommended choice

For v1, the cleanest balance is:

- `points[]`
- explicit `possessions[]`
- action unions inside each possession

That keeps the model structured enough for analytics and editing without becoming overengineered.

## Separation Guidance

- Do not extend the current `GameEvent` union for advanced tracking.
- Do not store advanced-tracking data inside `SavedGame` or `savedGames`.
- Do not dual-write the same game into both raw models.
- Do not let the current `gameStore` own advanced-tracking raw state.

Advanced tracking should have:

- its own persisted collection
- its own store
- its own save/load lifecycle

## Open Questions

These can stay flexible without blocking the schema direction:

- whether v1 location should start as zones, x/y, or both
- whether `stoppage` needs richer rule-specific detail immediately
- whether between-point transitions need more structure in v1
- whether timing should live on every action or only at point / possession boundaries initially
- whether non-standard formats (beach, goaltimate, quarters) need `GameTransition` variants beyond halftime and cap

## Recommended First Cut

If we want the smallest useful implementation slice, start with:

- `AdvancedTrackedGame`
- `GameSide`
- `Participant`
- `TrackedPoint`
- `PointLine`
- `PointSub`
- `PointPossession`
- `PullAction`
- `DiscPickupAction`
- `ThrowAction`
- `StoppageAction`

Then compile that raw structure into a stat-friendly representation and derive:

- goals
- assists
- completions
- touches
- blocks
- throwaways
- drops
- plus/minus
- points played
- holds / breaks

That is enough to support current stats, pass chains, and future both-side or scrimmage expansion without boxing us into the wrong model.

One possible implementation shape:

```ts
type CompiledGame = {
  points: CompiledPoint[];
  actions: CompiledStatAction[];
};

type CompiledStatAction = {
  pointId: string;
  possessionId: string;
  actionId: string;
  kind: 'pull' | 'disc_gain' | 'throw' | 'stoppage';
  sideId?: string;
  actorParticipantId?: string | null;
  receiverParticipantId?: string | null;
  defenderParticipantId?: string | null;
  previousThrowActionId?: string;
  nextThrowActionId?: string;
  statCredits?: {
    goalParticipantId?: string | null;
    assistParticipantId?: string | null;
    hockeyAssistParticipantId?: string | null;
    blockParticipantId?: string | null;
    throwawayParticipantId?: string | null;
    dropParticipantId?: string | null;
    touchParticipantId?: string | null;
    receivingTouchParticipantId?: string | null;
  };
};
```

The exact shape can evolve, but the important architectural choice is to separate raw game recording from stat-oriented compilation.
