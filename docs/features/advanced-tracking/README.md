# Advanced Tracking

> Maintained architecture map for the implemented advanced tracker.

Advanced tracking is intentionally separate from the basic `SavedGame` and `GameEvent[]` flow. It
supports single-team, both-team, and same-team scrimmage tracking with a point-first data model.

## Architecture

```text
AdvancedTrackedGame
  -> points[]
    -> possessions[]
      -> actions[]

AdvancedTrackedGame
  -> buildAnalyticsGame()
    -> AnalyticsGame
      -> pure stat utilities
        -> analytics UI and exports
```

The persisted model is optimized for capture, editing, and replay. Derived goals, assists,
completions, efficiencies, and visualizations are computed through the analytics layer rather than
stored as parallel counters.

Disc-action capture enters the store through the semantic `recordCaptureIntent` command. Tracker
touch, footer, rare-action, and voice adapters describe coach intent; the store resolves the
current holder/side, timestamps, undo, caps, and canonical pickup/throw actions atomically.
Possession metadata such as Red Zone enters through a dedicated store mutation that resolves the
same canonical possession boundary without creating a parallel counter.

## Pregame Team Controls

Basic and advanced pregame expose an inline opponent-name pencil in the team/receiving control.
Continuing commits the trimmed input even while focused; empty edits restore the previous opponent.
Basic keeps the team controls visible when stat tracking is off, without requiring a receiving side.
A small swap action beside our side appears only when another saved team is available.
Team naming and USAU import live in the Team tab; Settings contains app and display preferences.

Advanced creates sides and participants from the selected roster when Set Line is pressed.
Scrimmage keeps Light/Dark labels fixed and offers only the roster swap action.
Returning from line selection and continuing creates a fresh game from the current setup.

## In-game Help

The tracker's top bar keeps a labeled Help button visible. `TrackerHelpSheet` provides a
“What happened?” reference with a fixed list of core gestures — scored (swipe up or Goal),
throwaway (swipe down or T/A), drop (swipe down or Drop), and block (tap) — plus a “Something else
happened” row that points at More for actions like stall and Callahan. Help only opens local UI: it
does not record actions or change clocks. Practice comes in Buttons and Gestures variants (see
`TUTORIAL_ADVANCED_STEPS`); tracker-launched practice returns to the tracker and skips line
selection.

Fresh-install onboarding introduces advanced line selection before Buttons practice. That screen is
a tutorial-owned implementation with local fixture state. It may reuse neutral visual primitives,
but it does not use advanced-store state or add tutorial conditionals to production line-selection
components. Production and tutorial structure are kept aligned by a visible-contract test.

Line selection exposes the team presets as compact one-tap shortcuts in a single horizontally scrolling row. The fixed picker button opens the full
preset and recent-line picker. A selected preset remains highlighted as the active source while
the line is adjusted before confirming; adding players from `Other players` expands that section
without reordering the preset lineup. Choosing another preset or clearing the line exits the
current preset. Recent-line selections are temporary history sources and are cleared when manually
adjusted.

## Footer Actions

Whenever the tracked team has the disc, the footer shows a compact voice button plus T/A, Drop,
and Goal as always-on alternatives to the swipe gestures; swipes keep working. T/A records the
throwaway directly. Drop and Goal arm a `PassModifier` so the next player tap records the drop or
goal, using the same prompt, cancel control, and chip highlighting as More-menu modifiers. While the
opponent has the disc, the row shows Opp Goal and Opp Turn instead. While any modifier (More menu,
Goal, or Drop) owns the next tap, the whole row, offense or defense and including voice, is hidden
from view and from assistive tech until that modifier is used or canceled from the prompt; its
space stays reserved so the player grid does not resize. While any modifier is armed, the last-action
card offers only Cancel, not More, so another action cannot silently replace the armed one; cancel
first to choose a different rare action. When the disc is on the ground
mid-point (after a turnover), a non-interactive “TAP WHO HAS THE DISC” prompt replaces the
actions until a player picks it up; the opening pull keeps the actions so Drop can record a dropped
pull, and before the pull the last-action card shows the same prompt. Every footer row shares
`FOOTER_ACTION_HEIGHT`. In scrimmage, the actions apply to whichever side holds the disc.

The tracker screen derives this once per render with `getTrackerSessionView(game, { passModifier })`
in `lib/advancedTracking/trackerSessionView.ts` (via `useTrackerSession`), and passes the resulting
`TrackerSessionView` to the last-action card and rare menu. The footer is presentational: it renders
the view's `footerMode` (`offense`, `defense`, or `pickup`, each carrying `hidden` while a modifier
owns the next tap) plus callbacks, and never reads the store. `footerMode` is `null` once the point
is over or play is stopped, and no footer shows. Add new footer or card states to the session view
rather than re-deriving point, possession, or holder in a component. The armed `passModifier` stays
local to the tracker screen.

## State and Persistence

- `useAdvancedTrackingStore` owns the active `currentGame`, its `currentGameId`, undo state, and
  live tracker actions.
- The live-store persist snapshot keeps the active-game pointer, timer/session state, and pending
  next-point line selection needed for recovery. The pending selection owns only the lineups (plus
  its game/after-point context); PullTracking derives receiving/pulling side and gender ratio from
  the current game and settings.
- Whether the halftime break is active is rederived from the canonical SQLite game when that game
  is loaded or replaced. AsyncStorage retains countdown progress only while that derived break is
  active; it does not persist a second halftime-activity flag.
- Partial line drafts remain recoverable while preparing a point. PullTracking accepts only a
  current, ready draft: every full-roster side has exactly seven unique participants, anonymous
  sides are empty, and no participant is unknown or selected on both sides.
- During halftime, line preparation can update that pending selection without ending the break or
  creating the second-half point; the normal start flow still advances through pull tracking.
- `useSavedAdvancedGamesStore` owns saved-game summaries and an in-memory record cache.
- `lib/advancedTracking/storage.ts` persists full advanced games, summaries, and local undo
  metadata in SQLite. Live game/history pairs are captured before queueing and committed in one
  transaction; active recovery reads the pair from one row without using the saved-game cache.
- Actions that finalize, import, or otherwise save a game await SQLite persistence before clearing
  or navigating away from the state being saved.
- Finish clears local undo metadata before clearing the active pointer. Imports and non-live
  saved-game writes also clear it, so undo remains a local active-session capability.

Do not move advanced records into the basic store or introduce a second persisted representation
without a concrete requirement and migration plan.

## Domain Boundaries

- Two generic `sides` replace hard-coded team-one/team-two assumptions.
- `participants` are independent from side assignment so scrimmage players can switch sides by
  point.
- `transitionsAfter` records between-point team-controlled events such as timeouts.
- `gameTransitions` records halftime and cap progression.
- Field location remains optional through `locationMode`.
- Stable point, possession, action, and participant IDs define editing and analytics boundaries.

## Maintained References

- [data-model.md](data-model.md) — persisted domain model and event semantics.
- [analytics-layer.md](analytics-layer.md) — compiled query model produced by
  `buildAnalyticsGame()`.
- [stat-utils.md](stat-utils.md) — pure analytics utilities and derivation conventions.
- [voice-input.md](voice-input.md) — current voice-input behavior and future UX boundaries.

## Roadmap and Follow-up Design

- [Advanced location tracking](../../future-features/advanced-location-tracking.md) — exploratory
  field-first capture with approximate coordinates and a temporary bottom player pad.
- [Advanced throw classification](../../future-features/advanced-throw-classification.md) —
  optional manual huck/reset tags, derived analytics, and the boundary with location tracking.
- [Advanced red-zone possession tracking](../../future-features/advanced-red-zone-tracking.md) —
  implemented live possession tagging with conversion and pause-adjusted timing analytics.

## Primary Source Folders

| Area                 | Location                                    |
| -------------------- | ------------------------------------------- |
| Routes               | `app/(main)/advanced-tracking/`             |
| Tracker UI           | `components/advancedTracking/`              |
| Live hooks           | `hooks/advancedTracking/`                   |
| Domain and analytics | `lib/advancedTracking/`                     |
| Live state           | `store/advancedTracking/trackingStore.ts`   |
| Saved records        | `store/advancedTracking/savedGamesStore.ts` |
| Device workflows     | `.maestro/tests/advanced-tracker-*`         |

Exported types and tests describe current implemented behavior; these maintained documents describe
the intended domain contracts. If they disagree, reconcile the inconsistency and update the
outdated source in the same change.
