# AGENTS.md

## Purpose

This file is the Codex operating guide for this repository. Use it to quickly find the right files, apply project-specific patterns, and keep docs in sync.

Primary reference sources:

- `CLAUDE.md`
- `.agent/rules/general-rules.md`
- `.agent/workflows/*.md`
- `docs/README.md`
- `docs/architecture-rules.md`
- `docs/responsive-layout.md`

## Fast Start (First 2 Minutes)

1. Read `docs/README.md` for feature map and terminology.
2. Read `docs/architecture-rules.md` and `docs/responsive-layout.md` for non-negotiable patterns.
3. Identify owning store before changing state (`store/gameStore.ts` plus related stores).
4. If touching stat entry or view stats, plan matching doc updates in `docs/`.

## Project Map

- `app/`: Expo Router screens and modal routes.
- `components/`: UI and feature components.
- `store/`: Zustand state containers and types.
- `lib/`: Pure logic/utilities, sharing, and tests.
- `context/`: Providers (`AlertProvider`, theme context).
- `theme/theme.ts`: All theme tokens and colors.
- `docs/`: Project behavior and architecture docs.
- `.agent/workflows/`: Operational runbooks (OTA updates, release, doc sync).

## Task -> Where To Edit

- Score/game flow bugs:
  - `app/index.tsx`
  - `store/gameStore.ts`
  - `lib/gameUtils.ts`
  - `lib/timeoutUtils.ts`
- Stat entry flow (goal/assist):
  - `components/StatEntrySheet.tsx`
  - `components/stat-entry/*`
  - `app/StatEntryModal.tsx`
  - `docs/stat-tracking.md` (update when behavior changes)
- Turnover flow:
  - `components/TurnoverEntrySheet.tsx`
  - `components/turnover-entry/*`
  - `app/TurnoverEntryModal.tsx`
  - `docs/turnover-tracking.md`
- View stats and player/team analytics:
  - `app/ViewStats.tsx`
  - `app/PlayerStats.tsx`
  - `components/view-stats/*`
  - `lib/statsUtils.ts`
  - `lib/teamStatsUtils.ts`
  - `lib/playingTimeStatsUtils.ts`
  - `docs/view-stats.md` (update when behavior changes)
- Timeline and event editing:
  - `app/GameTimeline.tsx`
  - `components/timeline/EventTimeline.tsx`
  - `app/EditEventModal.tsx`
  - `lib/timelineUtils.ts`
- Roster/team management:
  - `app/EditRoster.tsx`
  - `app/TeamManagementModal.tsx`
  - `store/gameStore.ts`
  - `lib/playerUtils.ts`
- Line presets/line prompts:
  - `app/LinePresetEditor.tsx`
  - `app/LinePromptModal.tsx`
  - `components/lines/*`
  - `store/linePresetsStore.ts`
  - `lib/lineUtils.ts`
  - `lib/linePromptUtils.ts`
- Sharing/import:
  - `app/Import.tsx`
  - `lib/sharing/*`
  - `lib/storage/*`
  - `docs/future-features/sharing.md`
- Theming/UI consistency:
  - `theme/theme.ts`
  - `components/ThemedText.tsx`
  - `components/ThemedView.tsx`
  - `docs/theming.md`

## Engineering Rules (Project-Specific)

- Prefer derived state over `useEffect`.
- If `useEffect` is necessary, prefer extracting behavior into a custom hook.
- Do not use `useCallback` or `useMemo` (React Compiler workflow).
- No raw color values; use `theme/theme.ts`.
- No sub-components in the same file; one component per file.
- Use early returns where practical.
- Use `AlertProvider`; do not use native `Alert.alert`.
- Do not use `runOnJs`; use `scheduleOnRn`.
- App supports both portrait and landscape via `useLayout()` + `createStyles()` (see `docs/responsive-layout.md`).
- Do not use `useWindowDimensions` directly in screens/components; use `useLayout()` instead.
- Do not use orientation-based conditional style arrays (`!isLandscape && ...`); encode orientation in `createStyles()`.
- For modal UX/patterns, follow `docs/modals.md`.

## Navigation/Modal Rules

- Use `<Redirect href="..." />` for render-time conditional navigation.
- Do not call imperative router methods during render.
- Prefer `router.dismissTo('/')` over `router.back()` for modal exits.
- Keep a single root `SafeAreaProvider`; avoid extra per-screen `SafeAreaView`.

## State & Data Integrity Rules

- Determine state ownership before editing logic. Do not move state between stores without explicit approval.
- Use `checkGameOver()` in `lib/gameUtils.ts` instead of duplicating end-game logic.
- When changing game-end logic, update `lib/__tests__/gameUtils.test.ts`.
- Player names must be unique case-insensitively.
- Before deleting a player, validate references in current `events` and `savedGames`.
- For new persisted structures, consider `schemaVersion`.
- Use Immer-style updates for object state.

## Docs-First Quick Reference

- Project overview: `docs/README.md`
- Architecture rules: `docs/architecture-rules.md`
- Responsive layout pattern: `docs/responsive-layout.md`
- State ownership map: `docs/state-ownership.md`
- Navigation map: `docs/navigation-map.md`
- Event model: `docs/event-model.md`
- UI patterns: `docs/ui-patterns.md`
- Game logic/scoring/caps: `docs/game-logic.md`
- Stat entry: `docs/stat-tracking.md`
- Turnovers: `docs/turnover-tracking.md`
- View stats: `docs/view-stats.md`
- Modals: `docs/modals.md`
- Testing: `docs/testing.md`
- Testing map: `docs/testing-map.md`
- Point timer: `docs/point-timer.md`
- Line recording/selection: `docs/line-selection.md`
- Tech debt backlog: `docs/tech-debt.md`

When changing behavior in these areas, update the corresponding docs in the same change.

## Useful Commands

- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Lint: `npx eslint . --ext .ts,.tsx`
- Tests: `npm test`
- Single test target: `npm test -- gameUtils`

## Release/Deployment Runbooks

- Development build workflow: `.agent/workflows/dev-build.md`
- OTA update workflow: `.agent/workflows/eas-update.md`
- Production build checklist: `.agent/workflows/prod-build.md`
- Feature branch workflow: `.agent/workflows/feature-branch.md`
- Documentation sync workflow: `.agent/workflows/update-docs-from-learnings.md`
- Stat tracking doc sync workflow: `.agent/workflows/update-stat-tracking-docs.md`
