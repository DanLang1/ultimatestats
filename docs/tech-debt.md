# Tech Debt Backlog

Last updated: February 14, 2026

This document tracks intentionally deferred cleanup work discovered during the docs/rules/workflow audit.

## P1 - Modal Navigation Consistency

- Replace `router.back()` / `router.dismiss()` in modal exits with `router.dismissTo(...)` per modal navigation rules.
- For modals launched from non-root screens, use explicit parent destinations (for example `router.dismissTo('/GameInfo')`).
- References:
`docs/modals.md:136`
`docs/modals.md:146`
`app/EditEventModal.tsx:183`
`app/EditEventModal.tsx:211`
`app/EditEventModal.tsx:220`
`app/NumberPickerModal.tsx:46`
`app/NumberPickerModal.tsx:52`
`app/GameTimeline.tsx:86`
`app/LinePromptModal.tsx:88`
`app/LinePromptModal.tsx:93`

## P1 - Responsive Pattern Completion

- Finish migration to `useLayout()` + `createStyles(...)` in touched files still using static `StyleSheet.create` and inline orientation branches.
- Keep orientation logic centralized in style factories where practical.
- References:
`docs/responsive-layout.md:19`
`docs/responsive-layout.md:99`
`app/LinePromptModal.tsx:344`
`app/PointTransition.tsx:406`
`components/stat-entry/StatEntryInner.tsx:388`
`components/turnover-entry/TurnoverEntryInner.tsx:433`
`components/tutorial/StatsTrackingTutorial.tsx:183`
`components/tutorial/TutorialOverlay.tsx:191`

## P2 - Modal Theming Token Alignment

- Align modal text/background token usage with modal theming guidance (`modalText`, `modalTextMuted`, etc.) where currently using banned tokens.
- References:
`docs/modals.md:7`
`docs/modals.md:20`
`app/HalftimeModal.tsx:128`
`app/HalftimeModal.tsx:136`
`app/HalftimeModal.tsx:165`
`app/PullPromptModal.tsx:95`
`app/PullPromptModal.tsx:145`
`app/GameTimeline.tsx:89`
`app/GameTimeline.tsx:91`

## P2 - Remove Raw Color Literals

- Replace hardcoded color values with theme tokens.
- References:
`AGENTS.md:92`
`app/HalftimeModal.tsx:303`
`app/PullPromptModal.tsx:328`
`app/PullPromptModal.tsx:400`
`app/LinePromptModal.tsx:358`
`app/PlayerStats.tsx:167`

## P3 - Documentation Hygiene

- Refresh `docs/responsive-layout.md` migration list to remove files already migrated.
- Add `.agent/workflows/dev-build.md` to runbook index in `AGENTS.md`.
- Consider adding `docs/responsive-layout.md` to quick links in `docs/README.md`.
- References:
`docs/responsive-layout.md:99`
`AGENTS.md:143`
`docs/README.md:69`
