# Navigation Map

Reference map for screen and modal routing in Expo Router.

Before adding or restructuring a route, confirm layout behavior with [responsive-layout.md](responsive-layout.md) so the new screen works in both portrait and landscape.

## Route Inventory

Defined across:

- `app/_layout.tsx` (providers + group stack)
- `app/(main)/_layout.tsx` (primary screens)
- `app/(modals)/_layout.tsx` (transparent modal defaults)

### Primary Screens

- `/` (`app/(main)/index.tsx`)
- `/Dashboard` (`app/(main)/Dashboard.tsx`)
- `/GameInfo` (`app/(main)/GameInfo.tsx`)
- `/Settings` (`app/(main)/Settings.tsx`)
- `/EditRoster` (`app/(main)/EditRoster.tsx`)
- `/ImportTeam` (`app/(main)/ImportTeam.tsx`)
- `/ViewStats` (`app/(main)/ViewStats.tsx`)
- `/PlayerStats` (`app/(main)/PlayerStats.tsx`)
- `/LinePresetEditor` (`app/(main)/LinePresetEditor.tsx`)
- `/LineEditor` (`app/(main)/LineEditor.tsx`)
- `/PreGameConfirm` (`app/(main)/PreGameConfirm.tsx`)
- `/Import` (`app/(main)/Import.tsx`)
- `/s/[kind]/[shareId]` (`app/s/[kind]/[shareId].tsx`) - deep-link redirect route for shared game/team/games links
- `/Help` (`app/(main)/Help.tsx`)
- `/About` (`app/(main)/About.tsx`)

### Transparent Modals

- `/StatEntryModal` (`app/(modals)/StatEntryModal.tsx`)
- `/TurnoverEntryModal` (`app/(modals)/TurnoverEntryModal.tsx`)
- `/GameSelectorModal` (`app/(modals)/GameSelectorModal.tsx`)
- `/WinModal` (`app/(modals)/WinModal.tsx`)
- `/GameTimeline` (`app/(modals)/GameTimeline.tsx`)
- `/TeamManagementModal` (`app/(modals)/TeamManagementModal.tsx`)
- `/HalftimeModal` (`app/(modals)/HalftimeModal.tsx`)
- `/EditEventModal` (`app/(modals)/EditEventModal.tsx`)
- `/PointSummaryModal` (`app/(modals)/PointSummaryModal.tsx`)
- `/NumberPickerModal` (`app/(modals)/NumberPickerModal.tsx`)
- `/EditPlayerModal` (`app/(modals)/EditPlayerModal.tsx`)
- `/TimeoutModal` (`app/(modals)/TimeoutModal.tsx`)

## Core Flows

### Live Scoring Flow

1. `/` (scoreboard)
2. Optional pre-point setup:
   `/PreGameConfirm` (full-screen) when start-of-game inputs are required
3. Optional modal step:
   `/StatEntryModal` or `/TurnoverEntryModal` or `/TimeoutModal`
4. Line editor / summary step:
   `/LineEditor` or `/PointSummaryModal`
5. End game:
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
