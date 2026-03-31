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

  trackingScope: 'single-team' | 'both-teams';
  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  status: 'in_progress' | 'final' | 'terminated';
  endReason?: 'score_limit' | 'time_limit' | 'weather' | 'conceded' | 'manual';

  focusSideId: string;
  metadata?: GameMetadata;
  settings: AdvancedTrackingSettings;

  sides: GameSide[];
  participants: Participant[];
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
  scoring?: ScoringSettings;
}

interface ScoringSettings {
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
}

interface TrackedPoint {
  id: string;
  number: number;
  scoreStart: Record<string, number>;
  offenseStartSideId: string;
  attackingEndzoneBySide: Record<string, Endzone>;
  lineups: PointLineup[];
  possessions: PointPossession[];
  outcome:
    | {
        outcomeType: 'goal';
        scoringSideId: string;
        possessionId: string;
        actionId: string;
      }
    | { outcomeType: 'unfinished' }
    | { outcomeType: 'abandoned'; reason: 'weather' | 'injury' | 'manual' | 'other' };
  transitionsAfter?: BetweenPointTransition[];
}

interface PointLineup {
  sideId: string;
  participantIds: string[];
}

interface PointPossession {
  id: string;
  number: number;
  sideId: string;
  startedBy:
    | { startType: 'pull_received'; actionId: string }
    | { startType: 'pull_pickup'; actionId: string }
    | { startType: 'turnover'; causedByActionId: string }
    | { startType: 'dead_disc_check'; actionId: string };
  actions: PossessionAction[];
  endedBy:
    | { endType: 'goal'; actionId: string }
    | { endType: 'turnover'; actionId: string }
    | { endType: 'stoppage'; actionId: string }
    | { endType: 'end_of_recording' };
}

type BetweenPointTransition =
  | {
      id: string;
      transitionType: 'timeout';
      sideId: string;
      notes?: string;
    }
  | {
      id: string;
      transitionType: 'halftime' | 'spirit_timeout' | 'injury' | 'administrative' | 'heat_timeout';
      sideId?: string;
      notes?: string;
    };

type Endzone = 'near' | 'far';

type PlayerRef =
  | { refType: 'participant'; participantId: string }
  | { refType: 'unknown' }
  | { refType: 'untracked' };

type FieldLocation =
  | { locationType: 'zone'; zoneId: string }
  | { locationType: 'xy'; x: number; y: number };

type TurnoverAttribution =
  | { mode: 'single'; player: PlayerRef }
  | {
      mode: 'split';
      thrower: PlayerRef;
      receiver: PlayerRef;
    };

type PossessionAction =
  | PullAction
  | DiscGainAction
  | ThrowAction
  | StoppageAction;

interface PullAction {
  id: string;
  kind: 'pull';
  sideId: string;
  receivingSideId: string;
  puller: PlayerRef;
  receiver?: PlayerRef;
  result: 'caught' | 'dropped' | 'landed_in_bounds' | 'landed_in_bounds_rolled_out' | 'bricked';
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
}

interface DiscGainAction {
  id: string;
  kind: 'disc_gain';
  sideId: string;
  player: PlayerRef;
  source: 'pull_pickup' | 'turnover_pickup' | 'dead_disc_check';
  causedByActionId?: string;
  location?: FieldLocation;
}

interface ThrowAction {
  id: string;
  kind: 'throw';
  sideId: string;
  thrower: PlayerRef;
  targetSideId: string;
  targetPlayer?: PlayerRef;
  result: 'complete' | 'goal' | 'drop' | 'throwaway' | 'block' | 'callahan';
  defender?: PlayerRef;
  turnoverAttribution?: TurnoverAttribution;
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

For readability, `kind` is reserved for the main action union (`pull`, `disc_gain`, `throw`, `stoppage`).
Nested helper objects use more specific discriminator names like `refType`, `mode`, `startType`, `endType`, `transitionType`, and `outcomeType`.

## Semantics

### `scoreStart`

`TrackedPoint.scoreStart` means:

- key = `sideId`
- value = that side's score at the start of the point

Post-point score should be derived from `scoreStart` and `outcome`.

### `offenseStartSideId`

This should be stored explicitly.

Do not require consumers to infer starting offense from the first logged action. That is fragile when:

- the pull is not logged
- logging starts late
- the first action is a pickup instead of a catch

### `attackingEndzoneBySide`

Location data only makes sense if each point also records which endzone each side is attacking.

This is required for:

- heat maps
- progression
- red zone stats
- normalized field visuals

The invariant is simple: sides in the same point must attack opposite endzones.

### `lineups`

Participants exist for the game. `lineups` assign participants to a side for a specific point.

This is important for scrimmages because the same participant may be on different sides in different points.

`defaultSideId` is intentionally not part of `Participant`. Side membership should come from point lineup context, not be baked into the participant record.

### `PlayerRef`

`PlayerRef` distinguishes three very different cases:

- `refType: 'participant'`: known tracked player
- `refType: 'unknown'`: player identity matters for this side, but was not captured for this action
- `refType: 'untracked'`: this side is intentionally anonymous

That distinction is especially important in single-team tracking where the opponent side is usually anonymous.

### `disc_gain`

`disc_gain` is the possession-establishing action for non-caught-pull starts.

Use it when a side establishes possession by:

- picking up a grounded pull
- picking up after a turnover
- re-establishing play after a dead-disc check

This is better than a generic `touch` action because it captures why the possession started.

### `throw`

`throw` is the main pass action.

It supports:

- regular completions
- regular goals
- drops
- throwaways
- blocks
- Callahans

`targetSideId` is required because in rare cases the disc can end with the other side, such as a Callahan.
`targetSideId` is required, but `targetPlayer` is optional.

That distinction matters a lot for UI and data quality:

- for `complete`, `goal`, and most `drop` outcomes, `targetPlayer` will usually be present
- for `throwaway`, the intended receiver may be unknown or not worth capturing in the moment
- for fast logging, "Alex throwaway" should be valid without forcing a target player selection

So the model should answer two separate questions:

- which side was this throw intended for
- do we know which player on that side was the intended target

That is cleaner than requiring every failed throw to name a concrete receiver.

### `turnoverAttribution`

The current basic tracker supports `fiftyfifty`, which splits blame between thrower and receiver.

The advanced model should support that directly instead of forcing it to be inferred later.

That is why `ThrowAction` includes optional `turnoverAttribution`.

Examples:

- plain throwaway:
  `turnoverAttribution = { mode: 'single', player: thrower }`
- plain drop:
  `turnoverAttribution = { mode: 'single', player: targetPlayer }`
- fifty-fifty:
  `turnoverAttribution = { mode: 'split', thrower, receiver }`

This gives parity with existing stats while keeping the raw action simple.
For v1, `mode: 'split'` should always mean an even 50/50 attribution.

### `outcome`

Each point should explicitly store its outcome instead of forcing consumers to infer it from the final action.

That makes it much easier to answer:

- who scored this point
- which possession scored
- which points are unfinished
- which points were abandoned

### `transitionsAfter`

Use `transitionsAfter` for between-point events:

- halftime
- between-point timeout
- administrative pauses

Do not model these as in-point possession actions.

## Supported Tracking Modes

### Single-team tracking

This should be the default usage:

- `trackingScope: 'single-team'`
- one side is `full-roster`
- the opponent side is usually `anonymous`

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
- point `lineups` to assign participants per side, per point

That gives a clean model for inter-team scrimmages and same-roster split scrimmages.

## Derived Stats This Model Should Support

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
  trackingScope: 'single-team',
  gameType: 'game',
  status: 'in_progress',
  focusSideId: 'sharks',
  settings: { locationMode: 'none', scoring: { gameTo: 15, halftimeAt: 8 } },
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
      number: 1,
      scoreStart: { sharks: 0, rivals: 0 },
      offenseStartSideId: 'sharks',
      attackingEndzoneBySide: { sharks: 'far', rivals: 'near' },
      lineups: [{ sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
      possessions: [
        {
          id: 'pos1',
          number: 1,
          sideId: 'sharks',
          startedBy: { startType: 'pull_received', actionId: 'a1' },
          actions: [
            {
              id: 'a1',
              kind: 'pull',
              sideId: 'rivals',
              receivingSideId: 'sharks',
              puller: { refType: 'untracked' },
              receiver: { refType: 'participant', participantId: 'p_alex' },
              result: 'caught',
            },
            {
              id: 'a2',
              kind: 'throw',
              sideId: 'sharks',
              thrower: { refType: 'participant', participantId: 'p_alex' },
              targetSideId: 'sharks',
              targetPlayer: { refType: 'participant', participantId: 'p_blair' },
              result: 'complete',
            },
            {
              id: 'a3',
              kind: 'throw',
              sideId: 'sharks',
              thrower: { refType: 'participant', participantId: 'p_blair' },
              targetSideId: 'sharks',
              targetPlayer: { refType: 'participant', participantId: 'p_casey' },
              result: 'goal',
            },
          ],
          endedBy: { endType: 'goal', actionId: 'a3' },
        },
      ],
      outcome: { outcomeType: 'goal', scoringSideId: 'sharks', possessionId: 'pos1', actionId: 'a3' },
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
  number: 2,
  scoreStart: { sharks: 1, rivals: 0 },
  offenseStartSideId: 'sharks',
  attackingEndzoneBySide: { sharks: 'near', rivals: 'far' },
  lineups: [{ sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] }],
  possessions: [
    {
      id: 'pos2a',
      number: 1,
      sideId: 'sharks',
      startedBy: { startType: 'pull_pickup', actionId: 'b2' },
      actions: [
        {
          id: 'b1',
          kind: 'pull',
          sideId: 'rivals',
          receivingSideId: 'sharks',
          puller: { refType: 'untracked' },
          result: 'landed_in_bounds',
        },
        {
          id: 'b2',
          kind: 'disc_gain',
          sideId: 'sharks',
          player: { refType: 'participant', participantId: 'p_alex' },
          source: 'pull_pickup',
        },
        {
          id: 'b3',
          kind: 'throw',
          sideId: 'sharks',
          thrower: { refType: 'participant', participantId: 'p_alex' },
          targetSideId: 'sharks',
          result: 'throwaway',
          turnoverAttribution: {
            mode: 'single',
            player: { refType: 'participant', participantId: 'p_alex' },
          },
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'b3' },
    },
    {
      id: 'pos2b',
      number: 2,
      sideId: 'rivals',
      startedBy: { startType: 'turnover', causedByActionId: 'b3' },
      actions: [
        {
          id: 'b4',
          kind: 'disc_gain',
          sideId: 'rivals',
          player: { refType: 'untracked' },
          source: 'turnover_pickup',
          causedByActionId: 'b3',
        },
        {
          id: 'b5',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'untracked' },
          targetSideId: 'rivals',
          targetPlayer: { refType: 'untracked' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'b5' },
    },
  ],
  outcome: { outcomeType: 'goal', scoringSideId: 'rivals', possessionId: 'pos2b', actionId: 'b5' },
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
  targetSideId: 'sharks',
  targetPlayer: { refType: 'participant', participantId: 'p_blair' },
  result: 'throwaway',
  turnoverAttribution: {
    mode: 'single',
    player: { refType: 'participant', participantId: 'p_alex' },
  },
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
  number: 3,
  scoreStart: { sharks: 1, rivals: 1 },
  offenseStartSideId: 'rivals',
  attackingEndzoneBySide: { sharks: 'far', rivals: 'near' },
  lineups: [
    { sideId: 'sharks', participantIds: ['p_alex', 'p_blair', 'p_casey'] },
    { sideId: 'rivals', participantIds: ['p_ryan', 'p_sam', 'p_taylor'] },
  ],
  possessions: [
    {
      id: 'pos3a',
      number: 1,
      sideId: 'rivals',
      startedBy: { startType: 'pull_received', actionId: 'c1' },
      actions: [
        {
          id: 'c1',
          kind: 'pull',
          sideId: 'sharks',
          receivingSideId: 'rivals',
          puller: { refType: 'participant', participantId: 'p_alex' },
          receiver: { refType: 'participant', participantId: 'p_ryan' },
          result: 'caught',
        },
        {
          id: 'c2',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'participant', participantId: 'p_ryan' },
          targetSideId: 'rivals',
          targetPlayer: { refType: 'participant', participantId: 'p_sam' },
          result: 'block',
          defender: { refType: 'participant', participantId: 'p_blair' },
          turnoverAttribution: {
            mode: 'single',
            player: { refType: 'participant', participantId: 'p_ryan' },
          },
        },
      ],
      endedBy: { endType: 'turnover', actionId: 'c2' },
    },
    {
      id: 'pos3b',
      number: 2,
      sideId: 'sharks',
      startedBy: { startType: 'turnover', causedByActionId: 'c2' },
      actions: [
        {
          id: 'c3',
          kind: 'disc_gain',
          sideId: 'sharks',
          player: { refType: 'participant', participantId: 'p_blair' },
          source: 'turnover_pickup',
          causedByActionId: 'c2',
        },
        {
          id: 'c4',
          kind: 'throw',
          sideId: 'sharks',
          thrower: { refType: 'participant', participantId: 'p_blair' },
          targetSideId: 'sharks',
          targetPlayer: { refType: 'participant', participantId: 'p_casey' },
          result: 'goal',
        },
      ],
      endedBy: { endType: 'goal', actionId: 'c4' },
    },
  ],
  outcome: { outcomeType: 'goal', scoringSideId: 'sharks', possessionId: 'pos3b', actionId: 'c4' },
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
  targetSideId: 'sharks',
  targetPlayer: { refType: 'participant', participantId: 'p_blair' },
  result: 'drop',
  turnoverAttribution: {
    mode: 'split',
    thrower: { refType: 'participant', participantId: 'p_alex' },
    receiver: { refType: 'participant', participantId: 'p_blair' },
  },
};
```

Derived result:

- Alex gets 0.5 throwaway
- Blair gets 0.5 drop

If later we decide the UI should capture this as a dedicated outcome instead of a `drop` with split credit, the derivation layer can stay the same.

### Scenario 5: Same-team scrimmage

This shows why `participants` and `lineups` must stay separate.

```ts
const scrimmageGame: AdvancedTrackedGame = {
  id: 'scrim1',
  schemaVersion: 1,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  trackingScope: 'both-teams',
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
      number: 1,
      scoreStart: { white: 0, dark: 0 },
      offenseStartSideId: 'white',
      attackingEndzoneBySide: { white: 'far', dark: 'near' },
      lineups: [
        { sideId: 'white', participantIds: ['p_alex', 'p_blair'] },
        { sideId: 'dark', participantIds: ['p_casey', 'p_drew'] },
      ],
      possessions: [],
      outcome: { outcomeType: 'unfinished' },
    },
  ],
};
```

On the next point, Alex could appear on `dark` instead of `white` without changing the participant record at all.

That is exactly why side assignment belongs in point lineups, not in the player itself.

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
- whether mid-point substitutions need first-class support in v1
- whether `stoppage` needs richer rule-specific detail immediately
- whether Callahan should remain a `throw.result` or become a broader interception outcome family
- whether between-point transitions need more structure in v1
- whether timing should live on every action or only at point / possession boundaries initially

## Recommended First Cut

If we want the smallest useful implementation slice, start with:

- `AdvancedTrackedGame`
- `GameSide`
- `Participant`
- `TrackedPoint`
- `PointPossession`
- `PullAction`
- `DiscGainAction`
- `ThrowAction`
- `TrackedPoint.outcome`

Then derive:

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
