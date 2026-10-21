# Analytics Layer

> Rules for the compiled analytics model. Shapes live in `lib/advancedTracking/analyticsTypes.ts`;
> the compiler is `buildAnalyticsGame` in `lib/advancedTracking/buildAnalyticsGame.ts`, and its
> `emitAttributions` switch is the reference for which attributions each action produces.

## Purpose

```
AdvancedTrackedGame   raw model, optimized for capture and editing
        ↓  buildAnalyticsGame (pure, one pass)
  AnalyticsGame       points, possessions, actions, attributions
        ↓
  stat utils          typed, unformatted stat values
```

`AnalyticsGame` is generated in memory on demand and is never persisted. Edits and corrections
always mutate the raw game; analytics is rebuilt from it, so derived credit (completions, assists,
goals, turnovers) moves automatically without stored counters.

## Rules

- **Attributions are resolved once.** The compiler decides who gets credit for each action; stat
  utils only sum `attributions`, never re-derive credit from raw actions.
- **Player identity:** an `unknown` ref resolves to `UNKNOWN_PARTICIPANT_ID`; an `untracked` ref
  resolves to `null` and receives no attribution.
- **Perspective:** `point.state` is from `focusSideId`. For both-team tracking and scrimmages, use
  `getPointStateForSide(point, sideId)`; `terminated` and `in_progress` are the same for every side.
- **Hockey assist** is the only credit that looks back: `previousActionId` links each action to the
  one before it in its possession.
- **50/50 drops** emit a `throwaway` and a `drop`, each with `SPLIT_ATTRIBUTION_WEIGHT` and
  `splitAttribution: true`. A plain throwaway has no receiver, so it is never split.
- **Touches:** `receiving_touch` (catching a throw) and `pull_reception` (catching the pull) stay
  separate; total touches add both plus `disc_pickup`.
- **Callahan:** the thrower's possession stays `turned_over`; the defender is credited with
  `callahan`, `block`, and `goal`. Team conversion adds one synthetic scored D-possession for the
  scoring side instead of changing the raw model.
- **Throw details** (`huck` / `backfield_reset`) are copied onto throw actions but emit no
  attributions, so turnover and plus/minus math ignore them.
- **Possession conversion** denominators include the side's current `in_progress` or `terminated`
  possession; only `scored` counts as a conversion.
- **Red Zone timing** subtracts completed stoppages, game-clock pauses, and goal-to-undo dead time.
  Active and terminated possessions can contribute entry timing; only scored or turned-over
  possessions have outcome timing.
- **Missing timing is `null`, never zero.**

## Fail Fast

The compiler throws rather than produce misleading analytics, including for unfinished historical
points, unfinished possessions other than the final live one, unknown side or participant ids,
actions whose side disagrees with their possession, and Red Zone entries after the possession
outcome. It never mutates the raw game.

## Boundaries

The analytics layer resolves refs, attaches point and possession context, emits attributions, and
derives point states. It does not format values, choose screen filters (date, opponent, tournament,
half), persist anything, or know about the UI.
