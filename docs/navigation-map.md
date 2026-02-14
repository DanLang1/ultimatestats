# Navigation Map

Reference map for screen and modal routing in Expo Router.

## Route Inventory

Defined in `app/_layout.tsx`.

### Primary Screens

- `/` (`app/index.tsx`)
- `/Dashboard`
- `/GameInfo`
- `/Settings`
- `/EditRoster`
- `/ImportTeam`
- `/ViewStats`
- `/PlayerStats`
- `/LinePresetEditor`
- `/PointTransition`
- `/Import`
- `/Help`
- `/About`

### Transparent Modals

- `/StatEntryModal`
- `/TurnoverEntryModal`
- `/PullPromptModal`
- `/GameSelectorModal`
- `/WinModal`
- `/GameTimeline`
- `/TeamManagementModal`
- `/HalftimeModal`
- `/EditEventModal`
- `/PointSummaryModal`
- `/NumberPickerModal`
- `/EditPlayerModal`
- `/LinePromptModal`
- `/TimeoutModal`

## Core Flows

### Live Scoring Flow

1. `/` (scoreboard)
2. Optional modal step:
`/StatEntryModal` or `/TurnoverEntryModal` or `/TimeoutModal`
3. Point transition step:
`/PointTransition` or `/PointSummaryModal`
4. End game:
`/WinModal` then `/ViewStats`

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
2. `/PlayerStats`
3. Optional game selection:
`/GameSelectorModal`
4. Timeline edit path:
`/GameTimeline` -> `/EditEventModal`

## Modal Exit Contract

Use `router.dismissTo(...)` with explicit target when modal was opened from a non-root screen.

Examples:

- `/EditPlayerModal` -> `router.dismissTo('/EditRoster')`
- `/GameSelectorModal` -> `router.dismissTo('/PlayerStats')`
- `/TeamManagementModal` -> `router.dismissTo('/EditRoster')`

Keep this map in sync with `docs/modals.md`.

