# Advanced Stat Tracking Data Model

> **Status**: Brainstorm / Future Feature

This document proposes the data model for advanced stat tracking.

## Why This Should Be A New Model

The current stat model is intentionally narrow:

- `SavedGame` is built around one tracked roster plus a shallow opponent snapshot.
- `GameEvent` only models `goal`, `turnover`, and `timeout`.
- most detailed game state lives in one flat event stream with point metadata split across separate fields

That works for basic stats, but advanced tracking needs more:

- pass-by-pass actions
- optional location data
- support for tracking both sides
- support for scrimmages where both sides come from the same team
- room for future action types without another large schema rewrite

Because of that, advanced stat tracking should not be layered onto `SavedGame`.

## Design Goals

- Keep the persisted shape simple and explicit.
- Make a single point self-contained.
- Avoid `team1` / `team2` assumptions in the stored model.
- Keep persistence and state ownership separate from `SavedGame` and the current game store.
- Keep location optional on every action.
- Make editing safe with stable IDs, not array position as identity.
- Let new stats come from derived logic instead of more top-level stored counters.

## Core Recommendation

Use a dedicated top-level model for advanced tracking:

```ts
interface AdvancedTrackedGame {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  metadata?: GameMetadata;

  trackingScope: 'single-team' | 'both-teams';
  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  focusSideId: string;
  status: 'in_progress' | 'final' | 'terminated';
  endReason?: 'score_limit' | 'time_limit' | 'weather' | 'conceded' | 'manual';

  sides: GameSide[];
  participants: Participant[];
  points: TrackedPoint[];

  settings: {
    locationMode: 'none' | 'zone' | 'xy';
    scoring?: ScoringSettings;
  };
}
```

This should be the source of truth for the advanced feature.

It should be persisted independently from `SavedGame` and owned by a dedicated advanced-tracking store rather than the current game flow store.

## Recommended Types

```ts
interface GameSide {
  id: string;
  label: string; // "Home", "Away", "White", "Dark"
  color?: string;
  sourceTeamId?: string | null;
  trackingMode: 'full-roster' | 'anonymous';
}

type GameMetadata = {
  title?: string;
  opponentName?: string;
  location?: string;
  date?: string; // ISO date string: YYYY-MM-DD
  notes?: string;
};

type ScoringSettings = {
  gameTo?: number;
  halftimeAt?: number;
  softCapAt?: number;
  hardCapAt?: number;
};

interface Participant {
  id: string;
  name: string;
  sourcePlayerId?: string | null;
  defaultSideId?: string | null;
}

interface TrackedPoint {
  id: string;
  number: number;
  scoreStart: Record<string, number>; // key = sideId, value = score at start of this point
  offenseStartSideId: string;
  attackingEndzoneBySide: Record<string, Endzone>;
  lineups: PointLineup[];
  actions: PointAction[];
  outcome:
    | { kind: 'goal'; scoringSideId: string; actionId: string }
    | { kind: 'unfinished' }
    | { kind: 'abandoned'; reason: 'weather' | 'injury' | 'manual' | 'other' };
  transitionsAfter?: BetweenPointTransition[];
}

interface PointLineup {
  sideId: string;
  participantIds: string[];
}

type BetweenPointTransition =
  | {
      id: string;
      kind: 'timeout';
      sideId: string;
      notes?: string;
    }
  | {
      id: string;
      kind: 'halftime' | 'spirit_timeout' | 'injury' | 'administrative' | 'heat_timeout';
      sideId?: string;
      notes?: string;
    };

type Endzone = 'near' | 'far';

type PlayerRef =
  | { kind: 'participant'; participantId: string }
  | { kind: 'unknown' }
  | { kind: 'untracked' };

type FieldLocation = { kind: 'zone'; zoneId: string } | { kind: 'xy'; x: number; y: number };

type PointAction =
  | {
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
  | {
      id: string;
      kind: 'touch';
      sideId: string;
      player: PlayerRef;
      source: 'pull_pickup' | 'turnover_pickup' | 'dead_disc';
      causedByActionId?: string;
      location?: FieldLocation;
    }
  | {
      id: string;
      kind: 'throw';
      sideId: string; // throwing side
      thrower: PlayerRef;
      receiver: PlayerRef;
      receiverSideId: string;
      result: 'complete' | 'goal' | 'drop' | 'throwaway' | 'block' | 'callahan';
      defender?: PlayerRef;
      origin?: FieldLocation;
      target?: FieldLocation;
    }
  | {
      id: string;
      kind: 'stoppage';
      reason: 'timeout';
      sideId: string;
    }
  | {
      id: string;
      kind: 'stoppage';
      reason: 'injury';
      sideId?: string;
    };
```

## Why This Shape

### Point-first storage

Advanced tracking is naturally point-based. Keeping `points[]` as the main unit makes each point easier to view, edit, export, and validate.

### `scoreStart` semantics

`TrackedPoint.scoreStart` should be read as:

- key = `sideId`
- value = that side's score at the start of this point

So if a point starts at 8-7, `scoreStart` stores that pre-point score state.

The post-point score should be derived from `scoreStart` plus `TrackedPoint.outcome`, rather than stored redundantly on the point.

### Game-level metadata

`AdvancedTrackedGame` should include lightweight game-level metadata for display, filtering, and list views:

```ts
metadata?: {
  title?: string;
  opponentName?: string;
  location?: string;
  date?: string;
  notes?: string;
}
```

This solves practical UI needs that are not encoded in point data:

- showing a game list entry like "vs Bravo - March 1, 2026"
- filtering by date
- displaying opponent or venue
- keeping simple notes about the tracked session

`createdAt` is still useful as a storage timestamp, but it is not a good substitute for the human-facing date of the game.

### Game-level scoring settings

`AdvancedTrackedGame` should also store a lightweight scoring snapshot:

```ts
settings: {
  locationMode: 'none' | 'zone' | 'xy';
  scoring?: {
    gameTo?: number;
    halftimeAt?: number;
    softCapAt?: number;
    hardCapAt?: number;
  };
}
```

This makes the saved model self-contained for questions like:

- was this a universe point?
- what was the target score?
- when did halftime happen relative to the score?
- what cap score applied to this game?

The current basic game flow mixes baseline settings and runtime state:

- baseline config: `baseGameTo`, `autoHalftimeEnabled`, `softCapMins`, `gameLength`
- runtime/derived state: `gameTo`, `isSoftCap`, `softCapPending`, `gameHalf`, timer state

For a fresh advanced-tracking implementation, do not copy that shape directly.

Instead:

- store the scoring format snapshot needed for interpretation
- keep runtime game-flow state in the advanced store only
- avoid persisting mutable live fields like `isSoftCap` or `softCapPending` as part of the raw game record

The cleanest first cut is to persist the effective score thresholds, not the full timer/cap state machine.

That means advanced tracking can reuse current app defaults as inputs when creating a game, but it should not share live state ownership with the current `gameStore`.

If advanced tracking later supports mid-game scoring edits, the safer direction is:

- keep `settings.scoring` as the initial snapshot
- add an explicit settings/rules change history

That is better than mutating one stored `gameTo` field in place, because past points may have been played under different rules.

### Separate persistence and state ownership

Advanced stat tracking should be completely separate from the current `savedGames` system.

That means:

- no `SavedGame` embedding
- no foreign key or back-reference to `SavedGame`
- no use of the current `GameEvent[]` union as raw storage
- no ownership by the current game store

This feature should have its own persisted collection/schema and its own store lifecycle.

If data ever needs to be exported or compared across systems later, that can be designed as a separate reporting concern. It should not shape the raw storage model now.

### Tracking scope vs game type

These should be two separate fields.

`trackingScope` describes how much of the game is being tracked in detail:

- `single-team`
- `both-teams`

`gameType` describes what kind of session the record represents:

- `game`
- `scrimmage`
- `practice`
- `other`

This separation is important because `scrimmage` is not the same kind of concept as tracking scope.

Examples:

- normal game tracking only your team:
  `trackingScope: 'single-team'`, `gameType: 'game'`
- normal game tracking both rosters:
  `trackingScope: 'both-teams'`, `gameType: 'game'`
- white vs dark scrimmage:
  `trackingScope: 'both-teams'`, `gameType: 'scrimmage'`

So yes: "tracking only my team" and "both teams" belong here as top-level gameplay metadata, but not inside the `metadata` display object. "Scrimmage" is also important, but it belongs on a separate `gameType` axis rather than being merged into tracking scope.

### Explicit starting offense

`TrackedPoint` should explicitly store which side started on offense:

```ts
offenseStartSideId: string;
```

This is important for stats like:

- O-line conversion rate
- D-line break rate
- D-line block efficiency
- possessions started on offense vs defense

In theory this can sometimes be inferred from the first `pull` action, but that is too fragile:

- the pull may not be logged
- the point may be entered after the pull
- the first recorded action may be a pickup or throw
- consumers should not have to replay early actions just to classify the point

With `offenseStartSideId`, lineups stay simple:

- lineup where `sideId === offenseStartSideId` started on offense
- lineup where `sideId !== offenseStartSideId` started on defense

If line-level labels like "O-line" or "D-line" are ever needed as user-facing tags, they can still be derived from this field or added separately later without changing point semantics.

### Explicit attacking direction

`FieldLocation` coordinates only make sense if each point also records which endzone each side is attacking:

```ts
attackingEndzoneBySide: Record<string, Endzone>;
```

This is important for:

- heat maps
- field progression
- red zone entry and conversion
- pull placement relative to the receiving endzone

Without it, the same `x` value could mean "near our endzone" in one point and "near their endzone" in the next.

The intended interpretation is:

- `FieldLocation` uses one fixed field reference frame for the saved point
- `Endzone = 'near' | 'far'` describes which endzone a side is attacking within that frame

The key invariant is that the two sides must have opposite attacking endzones for a given point.

For example:

- if one side attacks `near`, the other side must attack `far`
- if direction flips at halftime, that should appear as new `attackingEndzoneBySide` values on later `TrackedPoint` records rather than mutating earlier points

That lets consumers normalize locations later for side-specific analytics without guessing from halftime state or point number.

### Explicit possession-chain links

Stable IDs are necessary for safe editing, but they are not enough to express relationships like:

- blocked throw -> defense picks up
- throwaway -> other side establishes possession
- grounded pull -> receiving side picks up

For those cases, the possession-establishing `touch` should be able to point back to the action that caused it:

```ts
type PointAction = {
  kind: 'touch';
  source: 'pull_pickup' | 'turnover_pickup' | 'dead_disc';
  causedByActionId?: string;
};
```

This is better than relying only on array order during edits.

Example:

- throw by Side A has `result: 'block'`
- later touch by Side B has `source: 'turnover_pickup'`
- that touch sets `causedByActionId` to the blocked throw's `id`

This creates an explicit possession chain without requiring a special-case block-only field.

Using a backward link on the dependent action is also more general than storing `gainedPossessionActionId` only on `throw`, because it works for:

- `throw.result = 'block'`
- `throw.result = 'throwaway'`
- `pull.result = 'landed_in_bounds'`

If the app later needs fast forward traversal for the editor, it can derive that with an index from `causedByActionId` rather than storing two pointers that must stay in sync.

### `dead_disc` touch semantics

`touch.source = 'dead_disc'` should be defined explicitly.

It means:

- the point is still live overall
- possession has not changed
- the disc was not picked up immediately
- play resumes when a player re-establishes possession with a new touch

This is different from:

- `pull_pickup`: first possession after a pull that was not caught cleanly
- `turnover_pickup`: first possession after the other side lost the disc
- `stoppage`: an interruption event such as a timeout or injury

In other words, `dead_disc` is for a resumed pickup during the same possession, not for a possession change and not for a timeout-style pause.

Examples where `dead_disc` can make sense:

- the disc is on the ground briefly and the same side picks it up to continue
- a live point resumes from a check or reset spot and the same side establishes possession again
- the disc rolls or sits before the offense picks it up, with no intervening turnover

For v1, that behavioral definition is enough.

If later analytics need more precision, this can evolve into a richer model such as:

- `deadDiscReason?: 'check' | 'foul' | 'travel' | 'other'`

But that detail does not need to be required in the first schema version.

### Explicit point outcome

`TrackedPoint` should carry its own outcome instead of forcing every consumer to scan the last action and infer how the point ended.

That makes common queries simpler:

- who scored this point
- which points are still unfinished
- whether a point was abandoned instead of completed

For a normal completed point, the outcome should be:

```ts
{
  kind: ('goal', scoringSideId, actionId);
}
```

The terminal throw action still carries the detailed action data, including whether there was an identifiable thrower for an assist. The point outcome just answers "how did this point end?"

So the point conclusion is usually a goal for one side, not "goal/assist" as one combined concept. The assist remains derived from the terminal throw action and may be absent in edge cases.

This also cleanly handles a Callahan:

- the terminal `throw` action belongs to the throwing side
- `receiverSideId` is the defending side that made the interception
- `result: 'callahan'`
- `TrackedPoint.outcome` is `{ kind: 'goal', scoringSideId: receiverSideId, actionId }`

That lets the model record all of these at once:

- turnover charged to the thrower side
- goal credited to the intercepting side
- scorer credited to the intercepting player if known
- no synthetic extra action required just to end the point

Rare non-standard endings should also be representable:

- `unfinished` for an in-progress point
- `abandoned` for a point stopped and not completed

If the entire game ends due to weather or concession, that should also be reflected at the game level via `status` and `endReason`, because that is not just a point-level concern.

### Between-point transitions

Some events happen after one point ends and before the next point starts.

Those should not be modeled as point `stoppage` actions. Instead, they should live in a dedicated between-point collection on the completed point:

```ts
transitionsAfter?: BetweenPointTransition[]
```

That keeps the semantics cleaner:

- `stoppage` is for in-point interruptions like timeouts or injuries during live play
- `outcome` is how the point ended
- `transitionsAfter` is for between-point events before the next point begins

This handles:

- halftime
- timeouts taken between points
- spirit timeouts
- administrative pauses or other dead time between points

It also keeps timeout semantics honest:

- timeout during a point -> `PointAction { kind: 'stoppage', reason: 'timeout' }`
- timeout between points -> `BetweenPointTransition { kind: 'timeout' }`

Timeout ownership is important enough that `sideId` should be required for timeout variants in both places.

That keeps timeout stats and editing straightforward:

- which side called the timeout
- how many timeouts each side used
- whether a stoppage or transition should affect one side's remaining timeout state

Consumers should treat `transitionsAfter: undefined` and `transitionsAfter: []` as equivalent: both mean there were no recorded between-point transitions.

For persistence, it is better to choose one canonical write shape. The cleaner default is to omit the field when there are no transitions rather than storing empty arrays unnecessarily.

If between-point handling grows more complex later, `transitionsAfter` can move into a dedicated top-level game timeline without changing the meaning of point actions.

### Single-team tracking as the default

Most real usage will be "track my team in a normal game."

The model should treat that as the primary case:

- `trackingScope: 'single-team'`
- `gameType: 'game'`
- `focusSideId` points at the user's team
- that side uses `trackingMode: 'full-roster'`
- the opponent side usually uses `trackingMode: 'anonymous'`

That means the model stays symmetric, but the common workflow is still explicit and easy to reason about.

### Anonymous tracking behavior

`GameSide.trackingMode` needs explicit behavioral meaning:

- `full-roster`: player identity is intended to be tracked for this side
- `anonymous`: this side is tracked at the side/team level only, not the player level

In anonymous mode, actions for that side should still be logged. The difference is that player references for that side are intentionally not resolved to named participants.

That means:

- opponent throws can still be logged
- opponent catches can still be logged
- possession changes can still be logged
- pulls, blocks, throwaways, goals, and location data can still be logged

The recommended `PlayerRef` semantics are:

- `{ kind: 'participant' }`: player identity is known and intentionally tracked
- `{ kind: 'unknown' }`: this side is in `full-roster` mode, but the specific player was not captured for this action
- `{ kind: 'untracked' }`: this side is in `anonymous` mode, so player identity is intentionally not being recorded

Examples:

- anonymous opponent completion:
  `thrower: { kind: 'untracked' }`, `receiver: { kind: 'untracked' }`
- anonymous opponent throwaway:
  `thrower: { kind: 'untracked' }`
- our tracked player catches an opponent pull from an unknown opponent puller:
  `puller: { kind: 'untracked' }`, `receiver: { kind: 'participant', participantId: ... }`

Lineup behavior should also be explicit:

- `PointLineup` is expected for `full-roster` sides
- for `anonymous` sides, lineup records can be omitted because player-level on-field identity is not part of the tracked data

This gives two clearly different classes of derived stats.

Available with anonymous side tracking:

- team/side-level possessions
- team/side-level completions and turnovers
- pull stats
- point outcomes
- conversion and break rates
- field progression and heat-map data

Not available for anonymous sides:

- player-level touches
- player-level assists
- player-level completions / receiving
- individual blocks
- player-level plus/minus
- line-based player stats

This distinction is important in single-team tracking, where the most common setup is:

- focus side: `trackingMode: 'full-roster'`
- opponent side: `trackingMode: 'anonymous'`

### `sides` instead of `team1` / `team2`

The current basic stats model hard-codes `team1` and `team2`. Advanced tracking should use neutral side IDs so normal games and scrimmages use the same structure.

### `participants` separate from lineups

Participants exist for the game as a whole. Lineups assign them to a side for a specific point. That avoids baking one permanent team ownership assumption into every player record.

### `zone | xy` for location

The old doc assumed direct x/y coordinates. That is probably too opinionated this early. A union keeps rough location tracking possible now and full coordinates possible later.

### Dedicated `pull` action

Pulls are meaningful enough that they should not be folded into generic `throw` or `touch` actions.

An explicit `pull` action lets the model represent:

- who pulled
- who fielded the pull, if anyone
- whether the pull was caught, dropped, landed in bounds, landed in bounds then rolled out, or bricked
- hang time
- optional landing location

A caught pull should be represented by the `pull` action itself, not by a second synthetic `touch`. That avoids double-counting touches.

If the pull is not caught and the offense later picks up the disc, that can be recorded as a `touch` with `source: 'pull_pickup'`.

This has one important stat implication: player touches must count a caught pull separately from regular throw receptions.

In other words:

- a `pull.receiver` catch counts as a touch
- it should not require a synthetic `touch` action just to make touch totals work
- regular receiving touches still come from completed `throw` actions

The intended pull result semantics are:

- `caught`: the receiving side caught the pull cleanly
- `dropped`: the receiving side touched the pull but did not complete the catch, which results in a turnover
- `landed_in_bounds`: the pull first hit the ground in bounds without being touched
- `landed_in_bounds_rolled_out`: the pull first landed in bounds, then rolled out of bounds
- `bricked`: the pull went out of bounds in the air without landing in bounds first

This distinction matters because restart options and UI prompts are not always the same.

One important possession consequence:

- for `dropped`, the receiving side does not end up with possession
- the next possession-establishing action should usually be a `touch` with `source: 'turnover_pickup'` for the pulling side
- this should not be modeled as `dead_disc`, because `dead_disc` is reserved for resumed pickup during the same possession

Even though players may describe a dropped pull as a "dead disc" situation conversationally, the model should treat it as a turnover chain because possession changed.

This also handles partial observability in single-team mode:

- if the opponent pulls to your team and you do not know the puller, use `puller: { kind: 'unknown' }`
- if your team pulls and you do not know who received it for the opponent, use `receiver: { kind: 'unknown' }`
- if your team catches the pull, that receiving player can still be identified normally

When the side itself is anonymous, prefer `{ kind: 'untracked' }` instead of `{ kind: 'unknown' }`.

Using `PlayerRef` is better than a raw nullable ID because it distinguishes:

- known tracked player
- temporarily unknown player
- intentionally untracked player

### Explicit receiving side on throws

Most throws are received by the same side that threw them, but that is not always true.

Adding `receiverSideId` makes edge cases explicit:

- normal completion: `receiverSideId === sideId`
- normal goal: `receiverSideId === sideId`
- Callahan: `receiverSideId !== sideId`

Without this field, a terminal interception-for-goal would be harder to model cleanly.

### Stable action IDs

If the advanced tracker supports timeline editing, action identity should not depend on array index. Stable IDs make inserts, deletes, and corrections safer.

## Derived Stats

These should be calculated from point actions, not stored as raw counters:

- goals
- completions
- completion percentage
- touches, including caught pulls via `pull.receiver`, not only `touch` and `throw` records
- assists
- hockey assists
- blocks
- throwaways
- drops
- total turnovers
- plus/minus for players on tracked full-roster sides
- callahans
- points played
- point win rate
- O-points
- D-points
- O-line holds
- D-line breaks
- O-efficiency
- D-efficiency
- minutes played
- playing time percentage
- average point duration for players with timed points
- goals per point
- assists per point
- blocks per point
- turnovers per point
- throwaways per point
- drops per point
- O-line conversion rate
- D-line break rate
- D-line block efficiency
- holds
- clean holds
- dirty holds
- breaks
- times broken
- break efficiency
- defensive efficiency
- opponent turnovers forced
- team conversion rate
- points per turnover
- turnovers per point
- longest scoring run
- longest drought
- pulls
- average pull hang time
- pull in-bounds vs out-of-bounds rate
- direction-normalized field progression
- point outcomes by side
- abandoned points
- field progression
- time of possession when event timing is available
- average point duration / longest point / shortest point when timing is available

Secondary derived views that also exist in the current stats experience or are natural extensions:

- chemistry / connection stats between throwers and receivers
- cumulative impact timeline
- red zone efficiency
- location heat maps

## Separation Guidance

- Do not extend the current `GameEvent` union for advanced tracking.
- Do not store advanced-tracking data inside `SavedGame` or `savedGames`.
- Do not share raw event ownership with the current game store.
- Do not dual-write the same gameplay entry into both systems.

The advanced tracker should be its own source of truth with its own persistence and state boundary.

## Open Questions To Leave Flexible

- Whether rough field tracking should start as named zones, x/y coordinates, or a UI that can emit either.
- Whether anonymous opponent tracking needs placeholders like "Opponent 1" or side-level aggregates only.
- Whether point lineups should support substitutions inside a point in v1 or stay start-of-point only.
- Whether pulls, dead discs, and stoppages need richer detail in the first schema version.
- Whether the advanced raw action model needs an explicit equivalent to the current basic `fiftyfifty` turnover type for parity with existing tracking.
- Whether `block` and `callahan` should stay as explicit throw results or be modeled as a more general interception outcome family.
- Whether `BetweenPointTransition` needs richer structure than `kind`, `sideId`, and `notes`.
- Whether `causedByActionId` should stay optional-only on `touch` or become part of a broader action-linking model.
- Whether `dead_disc` eventually needs a required subtype for rules-specific situations.
- Whether mid-game scoring/rules edits need a first-class change history in v1 or can wait until later.

## Recommended First Cut

If this feature starts small, the simplest useful slice is:

- `AdvancedTrackedGame`
- `GameMetadata`
- `ScoringSettings`
- `GameSide`
- `Participant`
- `TrackedPoint`
- `PointAction` with `pull`, `touch`, `throw`, and `stoppage`
- `FieldLocation` as `zone | xy`

That is enough to support pass chains, point lineups, both-side tracking, scrimmages, and future derived stats without overcommitting to the final UI.
