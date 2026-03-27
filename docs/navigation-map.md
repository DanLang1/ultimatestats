# Navigation Map

Reference map for screen and modal routing in Expo Router.

Before adding or restructuring a route, confirm layout behavior with [responsive-layout.md](responsive-layout.md) so the new screen works in both portrait and landscape.

## Route Inventory

Defined across:

- `app/_layout.tsx` (providers + group stack)
- `app/(main)/_layout.tsx` (main stack)
- `app/(main)/(hub)/_layout.tsx` (hub tabs shell)
- `app/(main)/(hub)/(home|game|analytics|team)/_layout.tsx` (per-tab nested stacks)
- `app/(modals)/_layout.tsx` (transparent modal defaults)

### Primary Screens

- `/` (`app/(main)/index.tsx`)
- `/TutorialIntro` (`app/(main)/TutorialIntro.tsx`)
- `/TutorialScoreboard` (`app/(main)/TutorialScoreboard.tsx`)
- `/TutorialComplete` (`app/(main)/TutorialComplete.tsx`)
- `/Scoreboard` (`app/(main)/(hub)/(game)/Scoreboard.tsx`)
- `/Dashboard` (`app/(main)/(hub)/(home)/Dashboard.tsx`)
- `/GameInfo` (`app/(main)/(hub)/(game)/GameInfo.tsx`)
- `/Settings` (`app/(main)/Settings.tsx`)
- `/EditRoster` (`app/(main)/(hub)/(team)/EditRoster.tsx`)
- `/ImportTeam` (`app/(main)/ImportTeam.tsx`)
- `/ViewStats` (`app/(main)/(hub)/(analytics)/ViewStats.tsx`)
- `/PlayerStats` (`app/(main)/(hub)/(analytics)/PlayerStats.tsx`)
- `/AggregateStats` (`app/(main)/(hub)/(analytics)/AggregateStats.tsx`)
- `/GameTimeline` (`app/(main)/(hub)/(analytics)/GameTimeline.tsx`)
- `/LinePresetEditor` (`app/(main)/LinePresetEditor.tsx`)
- `/SavedGameStats` (`app/(main)/(hub)/(analytics)/SavedGameStats.tsx`)
- `/saved-games/[gameId]` (`app/(main)/(hub)/(analytics)/saved-games/[gameId].tsx`)
- `/LineEditor` (`app/(main)/LineEditor.tsx`)
- `/PreGameConfirm` (`app/(main)/PreGameConfirm.tsx`)
- `/GameComplete` (`app/(main)/GameComplete.tsx`)
- `/Import` (`app/(main)/Import.tsx`)
- `/s/[kind]/[shareId]` (`app/s/[kind]/[shareId].tsx`) - deep-link redirect route for shared game/team/games links
- `/Help` (`app/(main)/(hub)/(home)/Help.tsx`)
- `/About` (`app/(main)/(hub)/(home)/About.tsx`)

### Hub Tab Navigation

- Hub tabs are defined in `app/(main)/(hub)/_layout.tsx` and stay visible for all screens in hub tab stacks.
- Navigator background rule: every route shell in this tree must set an explicit themed scene background (`contentStyle` for stacks, `sceneStyle` for tabs). Missing navigator-level backgrounds can surface as white flashes during back/tab transitions even when each screen component has its own background color.
- Tab sections:
  - Home: `/Dashboard`, `/Help`, `/About`
  - Game: `/Scoreboard`, `/GameInfo`
  - Stats: `/ViewStats`, `/PlayerStats`, `/SavedGameStats`, `/AggregateStats`, `/GameTimeline`, `/saved-games/[gameId]`
  - Team: `/EditRoster`
- Scoreboard is a real hub tab, but the tab bar is hidden while `/Scoreboard` is visible. Pressing the Game tab routes to `/Scoreboard` for fresh/in-progress sessions or starts a fresh game flow for completed sessions when the current session is finished.
- Entry-route behavior: `/` is a declarative entry route. It waits for `useTutorialStore` hydration, sends first-launch users to `/TutorialIntro`, redirects to `/Scoreboard` for active/in-progress sessions, redirects to `/GameComplete` for finished sessions with a pending post-game decision, and otherwise lands on `/Dashboard`.

### Onboarding Flow

1. `/` waits for `useTutorialStore` hydration.
2. If onboarding is incomplete, `/` -> `/TutorialIntro`
3. `/TutorialIntro` -> `/TutorialScoreboard`
4. `/TutorialScoreboard` -> `/TutorialComplete`
5. `/TutorialComplete` -> `/Scoreboard` for "Start New Game" or `/Dashboard` then `/Settings` for "Explore Settings"

### Transparent Modals

- `/StatEntryModal` (`app/(modals)/StatEntryModal.tsx`)
- `/TurnoverEntryModal` (`app/(modals)/TurnoverEntryModal.tsx`)
- `/GameSelectorModal` (`app/(modals)/GameSelectorModal.tsx`)
- `/TeamManagementModal` (`app/(modals)/TeamManagementModal.tsx`)
- `/HalftimeModal` (`app/(modals)/HalftimeModal.tsx`)
- `/EditEventModal` (`app/(modals)/EditEventModal.tsx`)
- `/PointSummaryModal` (`app/(modals)/PointSummaryModal.tsx`)
- `/NumberPickerModal` (`app/(modals)/NumberPickerModal.tsx`)
- `/EditPlayerModal` (`app/(modals)/EditPlayerModal.tsx`)
- `/TimeoutModal` (`app/(modals)/TimeoutModal.tsx`)

## Core Flows

### Live Scoring Flow

1. `/` (entry route) -> `/Scoreboard`
2. Optional pre-point setup:
   `/PreGameConfirm` (full-screen) when start-of-game inputs are required
   Triggered declaratively from `/Scoreboard` when starting possession or first-point ratio is missing
3. Optional modal step:
   `/StatEntryModal` or `/TurnoverEntryModal` or `/TimeoutModal`
4. Line editor / summary step:
   `/LineEditor` or `/PointSummaryModal`
5. End game:
   save immediately, mark session finished, and present `/GameComplete`
   `/GameComplete` then `/Dashboard` or `/ViewStats` or `/Scoreboard` on undo/new game

### Route Gating Priorities

- `/Scoreboard` redirects to `/GameComplete` when the game is finished and the post-game decision is still pending.
- `/Scoreboard` redirects to `/Dashboard` when the game is finished and the post-game decision has already been acknowledged.
- `/Scoreboard` redirects to `/HalftimeModal` when halftime is active, stat entry is clear, and the game is not over.
- `/Scoreboard` redirects to `/PreGameConfirm` when pre-game inputs are still required.
- Otherwise `/Scoreboard` renders the live scoreboard UI.

### Team/Roster Management Flow

1. `/Settings` or `/Dashboard`
2. `/EditRoster`
3. Modal branches:
   `/EditPlayerModal`
   `/TeamManagementModal`
4. Presets:
   `/LinePresetEditor`

### Stats Review Flow

1. `/ViewStats`
2. Optional secondary analytics routes:
   `/SavedGameStats` or `/AggregateStats` or `/GameTimeline`
3. `/PlayerStats`
4. Optional game selection:
   `/GameSelectorModal`
5. Timeline edit path:
   `/GameTimeline` -> `/EditEventModal`

## Modal Exit Contract

Use `router.dismissTo(...)` with explicit target when modal was opened from a non-root screen.

Examples:

- `/EditPlayerModal` -> `router.dismissTo('/EditRoster')`
- `/GameSelectorModal` -> `router.dismissTo('/PlayerStats')`
- `/TeamManagementModal` -> `router.dismissTo('/EditRoster')`

Keep this map in sync with the `/add-modal` skill.
